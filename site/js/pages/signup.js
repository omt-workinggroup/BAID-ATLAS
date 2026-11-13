// Sign up in four steps, the same for every account type:
//   1 role     Account type (agent, company, developer, homeowner)
//   2 account  First and last name, email, phone, password. The phone is confirmed by an SMS code ("code"),
//              which also creates the account and signs it in.
//   3 info     Details and documents for the chosen type. Documents upload straight to private storage.
//   4 review   A summary with Edit links, the documents, declarations, then "Submit application".
// Then "done": the reference, the account type and the status. Nothing here says the account is approved.
// A draft (never passwords or files) is kept on this device, so the form picks up where it stopped.
import { boot, html, icon, markup, render } from "../core.js";
import {
  ROLES,
  STATUS,
  currentAccount,
  finishAccount,
  latestApplication,
  normalisePhone,
  removeDoc,
  roleName,
  sendCode,
  showPhone,
  submitApplication,
  uploadDoc,
  validPhone,
  verifyCode,
} from "../account.js";

boot();
const root = document.getElementById("auth");
const KEY = "pq-signup";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
};
const st = { info: {}, docs: {}, ...load() };
const keep = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...st, done: undefined }));
  } catch {
    /* storage unavailable */
  }
};
const forget = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
};
// /sign-up?role=company (from the Profile page) starts with that role picked.
const asked = new URLSearchParams(location.search).get("role");
if (ROLES.some(([k]) => k === asked)) st.role = asked;

let me = null; // the signed-in account, once the phone is confirmed
let pw = ""; // the password, held only until the code is confirmed
const previews = {}; // field -> object URL of an image chosen on this visit
const STEPS = ["role", "account", "code", "info", "review", "done"];
const NUMBER = { role: 1, account: 2, code: 2, info: 3, review: 4, done: 4 };
const LABEL = {
  role: "Account type",
  account: "Your details",
  code: "Your details",
  info: "Role details",
  review: "Review",
  done: "Submitted",
};
let step = new URLSearchParams(location.search).get("step");
if (!STEPS.includes(step)) step = "role";

function go(next, { replace = false } = {}) {
  step = next;
  history[replace ? "replaceState" : "pushState"](
    null,
    "",
    next === "role" ? "/sign-up" : `/sign-up?step=${next}`,
  );
  draw();
  scrollTo(0, 0);
}
addEventListener("popstate", () => {
  const s = new URLSearchParams(location.search).get("step");
  step = allowed(STEPS.includes(s) ? s : "role");
  draw();
});
// Which steps can be shown right now: before the phone is confirmed only 1 and 2; after it, not the code.
function allowed(s) {
  if (s === "done") return st.done ? s : me ? "review" : "role";
  if (!me)
    return s === "code" && !st.phone
      ? "account"
      : ["info", "review"].includes(s)
        ? "account"
        : s;
  if (s === "code") return "info";
  return s;
}

// ---- Small pieces --------------------------------------------------------------------------------------
const isCompany = () => st.role === "company";
const bar = () =>
  html`<div class="steps" aria-hidden="true">
      ${[1, 2, 3, 4].map((n) => html`<i class="${n <= NUMBER[step] ? "on" : ""}"></i>`)}
    </div>
    <p class="stepn">
      Step ${NUMBER[step]} of 4 ·
      ${LABEL[step]}${st.role && step !== "role" ? ` · ${roleName(st.role)}` : ""}
    </p>`;
const back = (to) =>
  to
    ? html`<a
        class="au__back"
        href="/sign-up${to === "role" ? "" : `?step=${to}`}"
        data-go="${to}"
        >${icon("back", 16, 2)}Back</a
      >`
    : html`<a class="au__back" href="/profile">${icon("back", 16, 2)}Back</a>`;
const errorBox = html`<p class="au__err" role="alert" hidden></p>`;
const v = (name) => st.info[name] ?? "";
function opt(text) {
  return text ? html` <em>${text}</em>` : "";
}
const input = (
  name,
  label,
  {
    type = "text",
    note = "",
    auto = "off",
    mode = "",
    ph = "",
    value = v(name),
  } = {},
) =>
  html`<label class="au__field"
    ><span>${label}${opt(note)}</span
    ><input
      name="${name}"
      type="${type}"
      autocomplete="${auto}"
      ${mode ? html`inputmode="${mode}"` : ""}
      placeholder="${ph}"
      value="${value}"
  /></label>`;
const area = (name, label, { note = "", ph = "" } = {}) =>
  html`<label class="au__field"
    ><span>${label}${opt(note)}</span
    ><textarea name="${name}" rows="4" placeholder="${ph}">${v(name)}</textarea>
  </label>`;
const select = (name, label, options, { note = "" } = {}) =>
  html`<label class="au__field"
    ><span>${label}${opt(note)}</span
    ><select name="${name}">
      <option value="">Choose…</option>
      ${options.map((o) => html`<option ${v(name) === o ? html`selected` : ""}>${o}</option>`)}
    </select></label
  >`;
const choice = (name, legend, options) =>
  html`<fieldset class="opts">
    <legend>${legend}</legend>
    ${options.map(
      ([value, label, sub]) =>
        html`<label class="opts__opt"
          ><input
            type="radio"
            name="${name}"
            value="${value}"
            data-redraw
            ${v(name) === value ? html`checked` : ""}
          /><span
            ><strong>${label}</strong
            >${sub ? html`<small>${sub}</small>` : ""}</span
          ></label
        >`,
    )}
  </fieldset>`;
const notice = (text, title = "") =>
  html`<div class="au__note">
    ${icon("shield", 18, 1.8)}
    <p>${title ? html`<strong>${title}</strong> ` : ""}${text}</p>
  </div>`;
const section = (title) => html`<h2 class="au__h2">${title}</h2>`;

// ---- Documents -----------------------------------------------------------------------------------------
const PDF_IMG = "application/pdf,image/jpeg,image/png,image/webp";
const IMG = "image/jpeg,image/png,image/webp";
const DOCS = {
  agent_licence: {
    label: "REAC agent licence",
    accept: PDF_IMG,
    max: 10,
    need: "If you have it",
    help: "Your licence certificate. We check it before your profile gets the Verified badge.",
  },
  photo: {
    label: "Profile photo",
    accept: IMG,
    max: 5,
    need: "Optional",
    help: "A clear photo of your face. Shown on your public profile once you're approved.",
  },
  logo: {
    label: "Logo",
    accept: IMG,
    max: 5,
    need: "Optional",
    help: "Square works best. Shown on your public profile once you're approved.",
  },
  broker_licence: {
    label: "REAC corporate broker licence",
    accept: PDF_IMG,
    max: 10,
    need: "If you broker",
    help: "Needed if the company sells or lets property for other owners.",
  },
  dev_licence: {
    label: "REAC licence evidence",
    accept: PDF_IMG,
    max: 10,
    need: "If you broker",
    help: "Your licence certificate.",
  },
  id_doc: {
    label: "Identity document",
    accept: PDF_IMG,
    max: 10,
    need: "Required",
    help: "A clear photo or scan of the front. For a Ghana Card, add the back in the same PDF if you can.",
  },
  mandate: {
    label: "Owner's written authorisation",
    accept: PDF_IMG,
    max: 10,
    need: "Before your listing goes live",
    help: "A signed letter or mandate from the owner allowing you to advertise. You can add it now or later.",
  },
};
const size = (b) =>
  b >= 1048576
    ? `${(b / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;
const kinds = (accept) =>
  accept === IMG ? "JPG, PNG or WebP" : "PDF, JPG or PNG";
function upload(field) {
  const d = DOCS[field];
  const f = st.docs[field];
  return html`<div class="up" data-up="${field}">
    <div class="up__head">
      <strong>${d.label}</strong><span class="up__need">${d.need}</span>
    </div>
    <p class="up__help">${d.help}</p>
    ${
      f
        ? html`<div class="up__file">
            ${previews[field] ? html`<img class="up__thumb" src="${previews[field]}" alt="" />` : html`<span class="up__thumb">${icon(f.type?.startsWith("image/") ? "photo" : "doc", 20, 1.6)}</span>`}
            <span class="up__name"
              ><strong>${f.name}</strong
              ><small
                >${size(f.size)} ·
                <span class="up__ok"
                  >${icon("check", 12, 3)}Uploaded</span
                ></small
              ></span
            >
            <span class="up__acts"
              ><label class="up__act"
                >Replace<input
                  type="file"
                  accept="${d.accept}"
                  data-file="${field}" /></label
              ><button type="button" class="up__act" data-remove="${field}">
                Remove
              </button></span
            >
          </div>`
        : html`<label class="up__drop"
            ><input
              type="file"
              accept="${d.accept}"
              data-file="${field}"
            />${icon("download", 18, 1.8)}<span
              ><strong>Choose a file</strong
              ><small>${kinds(d.accept)} · up to ${d.max} MB</small></span
            ></label
          >`
    }
    <p class="up__state" role="status" hidden></p>
  </div>`;
}
async function chooseFile(el) {
  const field = el.dataset.file;
  const d = DOCS[field];
  const file = el.files?.[0];
  const box = el.closest(".up");
  const say = (text, bad = false) => {
    const s = box.querySelector(".up__state");
    s.textContent = text;
    s.classList.toggle("up__state--bad", bad);
    s.hidden = !text;
  };
  if (!file) return;
  if (!d.accept.split(",").includes(file.type))
    return say(`That file type isn't accepted. Use ${kinds(d.accept)}.`, true);
  if (file.size > d.max * 1048576)
    return say(
      `That file is ${size(file.size)}. Choose one under ${d.max} MB.`,
      true,
    );
  say(`Uploading ${file.name}…`);
  box.classList.add("up--busy");
  try {
    const path = await uploadDoc(me.id, field, file);
    const old = st.docs[field]?.path;
    if (old) removeDoc(old).catch(() => {});
    st.docs[field] = {
      path,
      name: file.name,
      size: file.size,
      type: file.type,
    };
    if (previews[field]) URL.revokeObjectURL(previews[field]);
    if (file.type.startsWith("image/"))
      previews[field] = URL.createObjectURL(file);
    else delete previews[field];
    keep();
    box.outerHTML = markup(upload(field));
  } catch (e) {
    box.classList.remove("up--busy");
    say(e.message, true);
  }
}
async function dropFile(field) {
  const old = st.docs[field];
  delete st.docs[field];
  if (previews[field]) URL.revokeObjectURL(previews[field]);
  delete previews[field];
  keep();
  draw();
  if (old?.path) removeDoc(old.path).catch(() => {});
}

// ---- Step 3 forms, one per account type ----------------------------------------------------------------
// Each returns its fields; rows() lists what is shown (and submitted) for the choices made.
const INFO = {
  agent: {
    title: "Your professional details",
    lead: "Tell us how you work, so we can check your licence and affiliation.",
    form: () =>
      html` ${select("title", "Professional title", ["Real Estate Agent", "Realtor", "Sales Agent", "Other"])}
      ${v("title") === "Other" ? input("title_other", "Your title") : ""}
      ${input("licence", "REAC agent licence number", { note: "If you have one", ph: "e.g. REAC/AG/0000" })}
      ${choice("affiliation", "How do you work?", [
        [
          "affiliated",
          "I'm affiliated with an agency",
          "You work under a licensed broker or company",
        ],
        [
          "independent",
          "I work independently",
          "Not affiliated with an agency right now",
        ],
      ])}
      ${
        v("affiliation") === "affiliated"
          ? html`${input("agency", "Agency or company", { ph: "Type the agency name", auto: "organization" })}
            ${input("broker_name", "Broker's full name", { note: "If applicable" })}
            ${input("broker_licence_no", "Broker's REAC licence number", { note: "If applicable" })}`
          : v("affiliation") === "independent"
            ? notice(
                "Independent agents are reviewed by our team before they can list. Add your licence details so we can check them. This form doesn't decide whether you can practise.",
                "Manual review.",
              )
            : ""
      }
      ${section("Documents")}${upload("agent_licence")}${upload("photo")}`,
    rows: () => [
      [
        "title",
        "Professional title",
        v("title") === "Other" ? v("title_other") || "Other" : v("title"),
      ],
      ["licence", "REAC licence number", v("licence")],
      [
        "affiliation",
        "Works",
        v("affiliation") === "affiliated"
          ? "With an agency"
          : v("affiliation") === "independent"
            ? "Independently"
            : "",
      ],
      ...(v("affiliation") === "affiliated"
        ? [
            ["agency", "Agency", v("agency")],
            ["broker_name", "Broker", v("broker_name")],
            ["broker_licence_no", "Broker's licence", v("broker_licence_no")],
          ]
        : []),
    ],
    docs: () => ["agent_licence", "photo"],
    check: () => [
      ["title", v("title"), "Choose your professional title."],
      [
        "title_other",
        v("title") !== "Other" || v("title_other").trim(),
        "Add your title.",
      ],
      ["affiliation", v("affiliation"), "Tell us how you work."],
      [
        "agency",
        v("affiliation") !== "affiliated" || v("agency").trim(),
        "Add the agency you work with.",
      ],
    ],
  },
  company: {
    title: "Tell us about your company",
    lead: "This becomes your company's profile. You'll be its account administrator.",
    form: () =>
      html` ${input("company", "Company or agency name", { auto: "organization" })}
      ${input("reg_no", "Company registration number", { note: "If registered", ph: "e.g. CS000000000" })}
      ${input("company_email", "Company email", { type: "email", auto: "email" })}
      ${input("company_phone", "Company phone", { type: "tel", mode: "tel", ph: "030 000 0000" })}
      ${input("address", "Office address", { auto: "street-address", ph: "Street, area, city" })}
      ${input("website", "Website", { type: "url", note: "Optional", ph: "https://", mode: "url" })}
      ${area("about", "About the company", { note: "Recommended", ph: "What you do and where you work" })}
      ${section("Brokerage licence")}
      ${input("broker_licence_no", "REAC corporate broker licence number", { note: "If you broker" })}
      ${input("broker_name", "Designated broker's name", { note: "If you broker" })}
      ${input("broker_person_licence", "Designated broker's licence number", { note: "If you broker" })}
      ${section("Documents")}${upload("broker_licence")}${upload("logo")}
      ${notice("Once you're approved, you can invite your agents. Each of them gets their own login, so there's no shared password.")}`,
    rows: () => [
      ["company", "Company", v("company")],
      ["reg_no", "Registration number", v("reg_no")],
      ["company_email", "Company email", v("company_email")],
      ["company_phone", "Company phone", v("company_phone")],
      ["address", "Office address", v("address")],
      ["website", "Website", v("website")],
      ["about", "About", v("about")],
      ["broker_licence_no", "Corporate broker licence", v("broker_licence_no")],
      ["broker_name", "Designated broker", v("broker_name")],
      ["broker_person_licence", "Broker's licence", v("broker_person_licence")],
    ],
    docs: () => ["broker_licence", "logo"],
    check: () => [
      ["company", v("company").trim(), "Add the company name."],
      [
        "company_email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("company_email")),
        "Add a valid company email.",
      ],
      [
        "company_phone",
        validPhone(normalisePhone(v("company_phone"))),
        "Add a valid company phone number.",
      ],
      ["address", v("address").trim().length > 4, "Add the office address."],
      [
        "website",
        !v("website") || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v("website")),
        "Add a website starting with https://",
      ],
    ],
  },
  developer: {
    title: "Tell us about your development business",
    lead: "Who builds the projects you'll list.",
    form: () =>
      html` ${choice("dev_type", "Developer type", [
        ["company", "Registered company", "A business registered in Ghana"],
        ["individual", "Individual", "You develop in your own name"],
      ])}
      ${input("dev_name", v("dev_type") === "individual" ? "Your legal name" : "Developer or company name", { auto: v("dev_type") === "individual" ? "name" : "organization" })}
      ${v("dev_type") === "individual" ? "" : input("reg_no", "Company registration number", { ph: "e.g. CS000000000" })}
      ${input("biz_email", "Business email", { type: "email", auto: "email" })}
      ${input("biz_phone", "Business phone", { type: "tel", mode: "tel", ph: "030 000 0000" })}
      ${input("address", "Office or business address", { note: "If you have one", auto: "street-address" })}
      ${input("website", "Website", { type: "url", note: "Optional", ph: "https://", mode: "url" })}
      ${area("about", "Developer profile", { note: "Recommended", ph: "Projects you've built, where, and what's coming" })}
      ${choice(
        "brokers",
        "Do you also sell or let property for other owners?",
        [
          ["no", "No, only our own projects", ""],
          ["yes", "Yes, for other owners too", "This needs a REAC licence"],
        ],
      )}
      ${v("brokers") === "yes" ? input("licence", "REAC licence number") : ""}
      ${section("Documents")}${v("brokers") === "yes" ? upload("dev_licence") : ""}${upload("logo")}
      ${notice("Land documents, site plans and building permits are asked for when you add each project, not now.", "Project documents come later.")}`,
    rows: () => [
      [
        "dev_type",
        "Developer type",
        v("dev_type") === "individual"
          ? "Individual"
          : v("dev_type") === "company"
            ? "Registered company"
            : "",
      ],
      [
        "dev_name",
        v("dev_type") === "individual" ? "Legal name" : "Company",
        v("dev_name"),
      ],
      ...(v("dev_type") === "individual"
        ? []
        : [["reg_no", "Registration number", v("reg_no")]]),
      ["biz_email", "Business email", v("biz_email")],
      ["biz_phone", "Business phone", v("biz_phone")],
      ["address", "Address", v("address")],
      ["website", "Website", v("website")],
      ["about", "Profile", v("about")],
      [
        "brokers",
        "Sells for other owners",
        v("brokers") === "yes" ? "Yes" : v("brokers") === "no" ? "No" : "",
      ],
      ...(v("brokers") === "yes"
        ? [["licence", "REAC licence number", v("licence")]]
        : []),
    ],
    docs: () => [...(v("brokers") === "yes" ? ["dev_licence"] : []), "logo"],
    check: () => [
      ["dev_type", v("dev_type"), "Choose the developer type."],
      ["dev_name", v("dev_name").trim(), "Add the name."],
      [
        "reg_no",
        v("dev_type") !== "company" || v("reg_no").trim(),
        "Add the company registration number.",
      ],
      [
        "biz_email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("biz_email")),
        "Add a valid business email.",
      ],
      [
        "biz_phone",
        validPhone(normalisePhone(v("biz_phone"))),
        "Add a valid business phone number.",
      ],
      [
        "website",
        !v("website") || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v("website")),
        "Add a website starting with https://",
      ],
      ["brokers", v("brokers"), "Tell us whether you sell for other owners."],
      [
        "licence",
        v("brokers") !== "yes" || v("licence").trim(),
        "Add your REAC licence number.",
      ],
    ],
  },
  owner: {
    title: "Verify your homeowner profile",
    lead: "This stops people listing homes that aren't theirs. Your ID is never shown on your profile.",
    form: () =>
      html` ${select("id_type", "Type of ID", ["Ghana Card", "Passport", "Driver's licence", "Voter ID"])}
        <label class="au__field"
          ><span
            >${v("id_type") === "Ghana Card" ? "Ghana Card number" : "Document number"}</span
          ><input
            name="id_no"
            autocomplete="off"
            spellcheck="false"
            placeholder="${v("id_type") === "Ghana Card" ? "GHA-000000000-0" : ""}"
            value="${v("id_no")}"
        /></label>
        ${upload("id_doc")}
        ${choice("is_owner", "Are you the legal owner of the property?", [
          ["yes", "Yes, I'm the owner", ""],
          ["no", "No, I act for the owner", ""],
        ])}
        ${
          v("is_owner") === "yes"
            ? notice(
                "We may ask for proof of ownership, like a title deed or land certificate, when you list a property.",
                "Ownership evidence comes later.",
              )
            : v("is_owner") === "no"
              ? html`${select("relationship", "Your relationship to the owner", ["Family member", "Caretaker", "Power of attorney holder", "Lawyer", "Other"])}
                ${upload("mandate")}
                ${notice("Selling or letting for several unrelated owners as a service? Sign up as an agent or company instead.")}`
              : ""
        }
        <label class="agree"
          ><input
            type="checkbox"
            name="authority"
            value="yes"
            ${v("authority") === "yes" ? html`checked` : ""}
          /><span
            >${v("is_owner") === "no" ? "I have the owner's permission to advertise their property on Propertiq." : "I'm allowed to advertise the property I'll list on Propertiq."}</span
          ></label
        >`,
    rows: () => [
      ["id_type", "Type of ID", v("id_type")],
      [
        "id_no",
        "Document number",
        v("id_no") ? `•••• ${v("id_no").slice(-4)}` : "",
      ],
      [
        "is_owner",
        "Legal owner",
        v("is_owner") === "yes"
          ? "Yes"
          : v("is_owner") === "no"
            ? "No, acts for the owner"
            : "",
      ],
      ...(v("is_owner") === "no"
        ? [["relationship", "Relationship", v("relationship")]]
        : []),
      [
        "authority",
        "Authority to advertise",
        v("authority") === "yes" ? "Declared" : "",
      ],
    ],
    docs: () => ["id_doc", ...(v("is_owner") === "no" ? ["mandate"] : [])],
    check: () => [
      ["id_type", v("id_type"), "Choose your identity document."],
      [
        "id_no",
        v("id_type") !== "Ghana Card"
          ? v("id_no").trim().length >= 4
          : /^GHA-?\d{9}-?\d$/i.test(v("id_no").trim()),
        v("id_type") === "Ghana Card"
          ? "Enter the Ghana Card number, like GHA-000000000-0."
          : "Add the document number.",
      ],
      ["id_doc", st.docs.id_doc, "Upload your identity document."],
      ["is_owner", v("is_owner"), "Tell us whether you own the property."],
      [
        "relationship",
        v("is_owner") !== "no" || v("relationship"),
        "Choose your relationship to the owner.",
      ],
      [
        "authority",
        v("authority") === "yes",
        "Confirm you're allowed to advertise the property.",
      ],
    ],
  },
};

// ---- Views ---------------------------------------------------------------------------------------------
const pwRules = [
  ["At least 8 characters", (p) => p.length >= 8],
  ["A letter and a number", (p) => /[a-z]/i.test(p) && /\d/.test(p)],
];
const views = {
  role: () =>
    html`${back(me ? "review" : "")}${bar()}
      <h1>Who are you?</h1>
      <p class="au__lead">Choose how you'll list on Propertiq.</p>
      <form id="f" class="au__form" novalidate>
        <fieldset class="r4">
          <legend class="sr-only">Account type</legend>
          ${ROLES.map(
            ([k, label, ic, about]) =>
              html`<label class="r4__opt"
                ><input
                  type="radio"
                  name="role"
                  value="${k}"
                  ${k === st.role ? html`checked` : ""}
                /><span class="r4__box"
                  ><span class="r4__tick">${icon("check", 12, 3)}</span
                  ><span class="r4__ic">${icon(ic, 22)}</span
                  ><strong>${label}</strong><small>${about}</small></span
                ></label
              >`,
          )}
        </fieldset>
        <p class="au__hint">
          Choose the one that best describes how you'll list properties. You can
          ask to add another role later.
        </p>
        ${errorBox}<button
          type="submit"
          class="btn btn--dark"
          ${st.role ? "" : html`disabled`}
        >
          Continue
        </button>
      </form>
      <p class="au__alt">
        Already have an account? <a href="/sign-in">Sign in</a>
      </p>`,
  account: () => {
    const editing = Boolean(me);
    return html`${back("role")}${bar()}
      <h1>${editing ? "Your details" : "Create your account"}</h1>
      <p class="au__lead">
        ${isCompany() ? "You'll be the company's account administrator: the person who manages it on Propertiq." : "You'll sign in with your phone number and password."}
      </p>
      <form id="f" class="au__form" novalidate>
        ${isCompany() ? section("Account administrator") : ""}
        <div class="au__two">
          ${input("first", "First name", { auto: "given-name", value: st.first ?? "" })}
          ${input("last", "Last name", { auto: "family-name", value: st.last ?? "" })}
        </div>
        ${input("email", isCompany() ? "Your work email" : "Email address", { type: "email", auto: "email", value: st.email ?? "" })}
        ${
          editing
            ? html`<div class="au__field">
                <span>Phone number</span>
                <p class="au__fixed">
                  ${showPhone(me.phone)}
                  <span class="au__ok">${icon("check", 13, 3)}Verified</span>
                </p>
              </div>`
            : html`<label class="au__field"
                ><span>Phone number <em>We'll text you a code</em></span
                ><span class="au__phone"
                  ><span class="au__cc">+233</span
                  ><input
                    name="phone"
                    type="tel"
                    inputmode="tel"
                    autocomplete="tel-national"
                    placeholder="24 123 4567"
                    value="${st.phone ? st.phone.replace(/^\+233/, "") : ""}" /></span
              ></label>`
        }
        <label class="au__field"
          ><span
            >${editing && st.created ? html`New password <em>Leave blank to keep yours</em>` : "Password"}</span
          ><span class="au__pw"
            ><input
              name="password"
              type="password"
              autocomplete="new-password"
            /><button type="button" class="au__show" data-show>
              Show
            </button></span
          ></label
        >
        <ul class="pwrules" id="rules">
          ${pwRules.map(([t]) => html`<li>${icon("check", 12, 3)}${t}</li>`)}
        </ul>
        <label class="au__field"
          ><span>Confirm password</span
          ><span class="au__pw"
            ><input
              name="confirm"
              type="password"
              autocomplete="new-password"
            /><button type="button" class="au__show" data-show>
              Show
            </button></span
          ></label
        >
        ${errorBox}<button type="submit" class="btn btn--dark">
          ${editing ? "Save and continue" : "Continue"}
        </button>
      </form>
      ${editing ? "" : html`<p class="au__alt">Already have an account? <a href="/sign-in">Sign in</a></p>`}`;
  },
  code: () =>
    html`${back("account")}${bar()}
      <h1>Confirm your phone</h1>
      <p class="au__lead">
        Enter the 6-digit code we sent to
        <strong>${showPhone(st.phone)}</strong>.
        <a class="text-link" href="/sign-up?step=account" data-go="account"
          >Change</a
        >
      </p>
      <form id="f" class="au__form" novalidate>
        <label class="au__field"
          ><span class="sr-only">6-digit code</span
          ><input
            class="au__otp"
            name="code"
            inputmode="numeric"
            autocomplete="one-time-code"
            pattern="[0-9]*"
            maxlength="6"
            placeholder="••••••"
        /></label>
        ${errorBox}<button type="submit" class="btn btn--dark">
          Verify and continue
        </button>
      </form>
      <p class="au__alt">
        Didn't get it?
        <button type="button" class="text-link" id="resend" disabled>
          Resend in <span id="t">60</span>s
        </button>
      </p>`,
  info: () => {
    const r = INFO[st.role];
    return html`${back("account")}${bar()}
      <h1>${r.title}</h1>
      <p class="au__lead">${r.lead}</p>
      <form id="f" class="au__form" novalidate>
        ${r.form()}${errorBox}<button type="submit" class="btn btn--dark">
          Review application
        </button>
      </form>
      <p class="au__alt">Your progress is saved on this device.</p>`;
  },
  review: () => {
    const r = INFO[st.role];
    const rows = r.rows().filter(([, , val]) => val);
    const docs = r.docs();
    return html`${back("info")}${bar()}
      <h1>Review your application</h1>
      <p class="au__lead">
        Check everything before you send it. You can change any part.
      </p>
      <form id="f" class="au__form" novalidate>
        <section class="rv">
          <header>
            <h2>Account type</h2>
            <a href="/sign-up" data-go="role">Edit</a>
          </header>
          <dl>
            <div>
              <dt>Type</dt>
              <dd>${roleName(st.role)}</dd>
            </div>
          </dl>
        </section>
        <section class="rv">
          <header>
            <h2>${isCompany() ? "Account administrator" : "Your details"}</h2>
            <a href="/sign-up?step=account" data-go="account">Edit</a>
          </header>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>${st.first} ${st.last}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>${st.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                ${showPhone(me?.phone ?? st.phone)}
                <span class="au__ok">${icon("check", 13, 3)}Verified</span>
              </dd>
            </div>
          </dl>
        </section>
        <section class="rv">
          <header>
            <h2>
              ${r.title.replace(/^Tell us about y/, "Y").replace(/^Verify y/, "Y")}
            </h2>
            <a href="/sign-up?step=info" data-go="info">Edit</a>
          </header>
          <dl>
            ${rows.map(
              ([, label, val]) =>
                html`<div>
                  <dt>${label}</dt>
                  <dd>${val}</dd>
                </div>`,
            )}
          </dl>
        </section>
        <section class="rv">
          <header><h2>Documents</h2></header>
          ${docs.map((d) => upload(d))}
        </section>
        <label class="agree"
          ><input type="checkbox" name="accurate" /><span
            >The information I've given is accurate, and I'm allowed to create
            this account and share these documents.</span
          ></label
        >
        <label class="agree"
          ><input type="checkbox" name="terms" /><span
            >I accept the <a href="/terms" target="_blank">Terms of Use</a> and
            have read the
            <a href="/privacy" target="_blank">Privacy Notice</a>.</span
          ></label
        >
        ${errorBox}<button type="submit" class="btn btn--dark">
          Submit application
        </button>
      </form>`;
  },
  done: () => {
    const [label, about] = STATUS[st.done.status] ?? STATUS.submitted;
    return html`<div class="done">
      <span class="done__mark">${icon("check", 26, 2.4)}</span>
      <h1>Application submitted</h1>
      <p class="au__lead">
        Thanks, ${st.first}. Your account isn't verified yet: we'll check your
        details first.
      </p>
      <dl class="acct">
        <div>
          <dt>Reference</dt>
          <dd class="done__ref">${st.done.reference}</dd>
        </div>
        <div>
          <dt>Account type</dt>
          <dd>${roleName(st.done.account_type)}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            <span class="pill">${label}</span
            ><small class="acct__wait">${about}</small>
          </dd>
        </div>
      </dl>
      <h2 class="au__h2">What happens next</h2>
      <ol class="next">
        <li>
          <strong>We review it.</strong> Our team checks your details and
          documents.
        </li>
        <li>
          <strong>We'll contact you if we need more.</strong> By text or email,
          with exactly what's missing.
        </li>
        <li>
          <strong>You're verified.</strong> Then you can add your properties.
          Until then you can browse as usual.
        </li>
      </ol>
      <a class="btn btn--dark" href="/profile">Go to your profile</a>
    </div>`;
  },
};

// ---- Drawing and inline errors -------------------------------------------------------------------------
function draw() {
  if (["info", "review"].includes(step) && !INFO[st.role]) step = "role";
  render(root, views[step]());
  const form = document.getElementById("f");
  if (step === "code") {
    startResend();
    form.code.focus();
  }
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    submit[step](form);
  });
}
function fail(form, message) {
  const el = form.querySelector(".au__err");
  el.textContent = message;
  el.hidden = false;
}
function clearBad(form) {
  form
    .querySelectorAll("[aria-invalid]")
    .forEach((el) => el.removeAttribute("aria-invalid"));
  form.querySelectorAll(".au__bad").forEach((el) => el.remove());
  form.querySelector(".au__err").hidden = true;
}
// rules: [[field name, ok?, message]]. Marks every failing field and focuses the first. True when all pass.
function check(form, rules) {
  clearBad(form);
  const bad = rules.filter(([, ok]) => !ok);
  bad.forEach(([name, , message]) => {
    const el =
      form.querySelector(`[name="${name}"]`) ??
      form.querySelector(`[data-up="${name}"]`);
    if (!el) return;
    el.setAttribute("aria-invalid", "true");
    const where = el.closest(".au__field, .opts, .agree, .up") ?? el;
    where.insertAdjacentHTML(
      "beforeend",
      `<small class="au__bad">${message.replace(/[<>&]/g, "")}</small>`,
    );
  });
  if (!bad.length) return true;
  const first = form.querySelector("[aria-invalid]");
  (first.matches("input, select, textarea")
    ? first
    : first.querySelector("input")
  )?.focus();
  first.scrollIntoView({ block: "center" });
  return false;
}
async function busy(form, label, work) {
  const btn = form.querySelector("button[type=submit]");
  const was = btn.textContent;
  btn.disabled = true;
  btn.textContent = label;
  form.querySelector(".au__err").hidden = true;
  try {
    await work();
  } catch (e) {
    fail(form, e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = was;
  }
}

const submit = {
  role(form) {
    const role = new FormData(form).get("role");
    if (!role) return fail(form, "Choose an account type.");
    st.role = role;
    keep();
    go(
      me && st.created
        ? st.info && Object.keys(st.info).length
          ? "review"
          : "info"
        : "account",
    );
  },
  account(form) {
    const f = Object.fromEntries(new FormData(form));
    const first = String(f.first ?? "").trim();
    const last = String(f.last ?? "").trim();
    const email = String(f.email ?? "").trim();
    const phone = me ? me.phone : normalisePhone(f.phone);
    const password = String(f.password ?? "");
    const optionalPw = me && st.created;
    const ok = check(form, [
      ["first", first.length >= 1, "Add your first name."],
      ["last", last.length >= 1, "Add your last name."],
      [
        "email",
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        "Add a valid email address.",
      ],
      [
        "phone",
        me || validPhone(phone),
        "Enter a valid phone number, for example 024 123 4567.",
      ],
      [
        "password",
        (optionalPw && !password) || pwRules.every(([, t]) => t(password)),
        "Use at least 8 characters, with a letter and a number.",
      ],
      ["confirm", f.confirm === password, "The passwords don't match."],
    ]);
    if (!ok) return;
    Object.assign(st, { first, last, email });
    keep();
    if (me) {
      // Phone already confirmed: save the details on the account straight away.
      return busy(form, "Saving…", async () => {
        await finishAccount({
          role: st.role,
          first,
          last,
          email: email === me.email ? "" : email,
          password,
        });
        st.created = true;
        me = (await currentAccount()) ?? me;
        keep();
        go(Object.keys(st.info).length ? "review" : "info");
      });
    }
    busy(form, "Sending code…", async () => {
      await sendCode(phone);
      st.phone = phone;
      pw = password;
      keep();
      go("code");
    });
  },
  code(form) {
    const code = form.code.value.replace(/\D/g, "");
    if (code.length !== 6)
      return fail(form, "Enter the 6-digit code from the text message.");
    busy(form, "Checking…", async () => {
      await verifyCode(st.phone, code);
      const a = await currentAccount();
      // A number that already has a finished account with an application is simply signed in.
      if (a && !a.unfinished && (await latestApplication())) {
        forget();
        location.replace("/profile");
        return;
      }
      me = a;
      if (!pw) return go("account", { replace: true }); // the page was reloaded: ask for the password again
      try {
        await finishAccount({
          role: st.role,
          first: st.first,
          last: st.last,
          email: st.email,
          password: pw,
        });
      } catch (e) {
        go("account", { replace: true });
        return fail(document.getElementById("f"), e.message);
      }
      pw = "";
      st.created = true;
      me = (await currentAccount()) ?? me;
      keep();
      go("info", { replace: true });
    });
  },
  info(form) {
    if (!check(form, INFO[st.role].check()))
      return fail(form, "Some details need your attention.");
    go("review");
  },
  review(form) {
    const r = INFO[st.role];
    const missing = r.check().find(([, ok]) => !ok);
    if (missing) return fail(form, `${missing[2]} Use Edit to fix it.`);
    if (
      !check(form, [
        [
          "accurate",
          form.accurate.checked,
          "Please confirm your information is accurate.",
        ],
        [
          "terms",
          form.terms.checked,
          "Please accept the Terms of Use and Privacy Notice.",
        ],
      ])
    )
      return;
    busy(form, "Submitting…", async () => {
      const details = Object.fromEntries(
        r
          .rows()
          .filter(([name]) => name !== "id_no")
          .map(([name]) => [name, v(name)])
          .filter(([, val]) => val),
      );
      if (st.role === "owner") details.id_no = v("id_no"); // reviewers only: never shown on a profile
      details.email = st.email;
      details.phone = me.phone;
      const documents = r
        .docs()
        .filter((d) => st.docs[d])
        .map((d) => ({ field: d, ...st.docs[d] }));
      await finishAccount({
        role: st.role,
        first: st.first,
        last: st.last,
        email: st.email === me.email ? "" : st.email,
      });
      const now = new Date().toISOString();
      const saved = await submitApplication({
        account_type: st.role,
        first_name: st.first,
        last_name: st.last,
        details,
        documents,
        declared_at: now,
        terms_accepted_at: now,
      });
      forget();
      st.done = saved;
      Object.values(previews).forEach((u) => URL.revokeObjectURL(u));
      go("done", { replace: true });
    });
  },
};

// ---- Events --------------------------------------------------------------------------------------------
let timer;
function startResend() {
  clearInterval(timer);
  let left = 60;
  const btn = document.getElementById("resend");
  timer = setInterval(() => {
    left -= 1;
    const t = document.getElementById("t");
    if (t) t.textContent = String(left);
    if (left <= 0) {
      clearInterval(timer);
      btn.disabled = false;
      btn.textContent = "Send a new code";
    }
  }, 1000);
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      await sendCode(st.phone);
      btn.innerHTML = 'Resend in <span id="t">60</span>s';
      startResend();
    } catch (e) {
      fail(document.getElementById("f"), e.message);
      btn.disabled = false;
    }
  };
}

root.addEventListener("click", (e) => {
  const to = e.target.closest("[data-go]");
  if (to) {
    e.preventDefault();
    return go(allowed(to.dataset.go || "role"));
  }
  const show = e.target.closest("[data-show]");
  if (show) {
    const el = show.previousElementSibling;
    el.type = el.type === "password" ? "text" : "password";
    show.textContent = el.type === "password" ? "Show" : "Hide";
    return;
  }
  const rm = e.target.closest("[data-remove]");
  if (rm) dropFile(rm.dataset.remove);
});
root.addEventListener("change", (e) => {
  const el = e.target;
  if (el.matches("[data-file]")) return chooseFile(el);
  if (step === "role" && el.name === "role") {
    root.querySelector("button[type=submit]").disabled = false;
    return;
  }
  if (step !== "info" || !el.name) return;
  st.info[el.name] =
    el.type === "checkbox" ? (el.checked ? "yes" : "") : el.value;
  if (el.name === "dev_type" && el.value === "individual" && !v("dev_name"))
    st.info.dev_name = `${st.first ?? ""} ${st.last ?? ""}`.trim();
  keep();
  // Choices that show or hide fields redraw the form; what was typed is already saved.
  if (
    el.matches(
      "[data-redraw], select[name=title], select[name=id_type], input[name=is_owner]",
    )
  ) {
    draw();
    root
      .querySelector(
        `[name="${el.name}"]${el.type === "radio" ? ":checked" : ""}`,
      )
      ?.focus();
  }
});
root.addEventListener("input", (e) => {
  const el = e.target;
  if (
    step === "info" &&
    el.name &&
    !el.matches("[type=file], [type=radio], [type=checkbox]")
  ) {
    st.info[el.name] = el.value;
    keep();
  }
  if (step === "account" && el.name === "password") {
    root
      .querySelectorAll("#rules li")
      .forEach((li, i) => li.classList.toggle("on", pwRules[i][1](el.value)));
  }
  if (el.getAttribute("aria-invalid")) {
    el.removeAttribute("aria-invalid");
    el.closest(".au__field, .opts, .agree, .up")
      ?.querySelector(".au__bad")
      ?.remove();
  }
});

// ---- Start ---------------------------------------------------------------------------------------------
// Signed in already: with an application, go to the profile; without one, carry on from step 3 (or step 2
// if the details were never saved). Signed out: steps 1 and 2 only.
const a = await currentAccount();
if (a && !a.unfinished && (await latestApplication())) {
  forget();
  location.replace("/profile");
} else {
  if (a) {
    me = a;
    st.role = st.role ?? a.role;
    if (!a.unfinished) {
      st.created = true;
      st.first = st.first ?? a.first ?? a.name?.split(" ")[0];
      st.last = st.last ?? a.last ?? a.name?.split(" ").slice(1).join(" ");
      st.email = st.email ?? a.email ?? "";
    }
    if (!st.role) step = "role";
    else if (a.unfinished) step = "account";
    else if (["role", "code", "done"].includes(step))
      step = Object.keys(st.info).length ? "review" : "info";
  }
  step = allowed(step);
  if (step === "code" && !pw) step = "account";
  history.replaceState(
    null,
    "",
    step === "role"
      ? `/sign-up${st.role && !me && asked ? `?role=${st.role}` : ""}`
      : `/sign-up?step=${step}`,
  );
  draw();
}
