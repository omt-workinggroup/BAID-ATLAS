-- Rebrand: system messages in conversations are signed "Propertiq".
create or replace function public.get_conversation(p_inquiry uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inq public.inquiries;
  v_side text;
  v_result jsonb;
begin
  if not private.can_read_inquiry(p_inquiry) then
    raise exception 'conversation not found' using errcode = 'P0002';
  end if;
  select * into v_inq from public.inquiries where id = p_inquiry;
  v_side := case when v_inq.requester_id = auth.uid() then 'requester' else 'provider' end;

  select jsonb_build_object(
    'inquiry', jsonb_build_object(
      'id', v_inq.id, 'status', v_inq.status, 'created_at', v_inq.created_at,
      'listing_id', l.id, 'listing_title', l.title, 'listing_slug', l.slug,
      'listing_public', private.listing_is_public(l.id),
      'organization_name', o.name, 'organization_slug', o.slug,
      'requester_name', coalesce(rp.display_name, 'Someone'),
      'contact_phone', case when v_side = 'provider' then v_inq.contact_phone end,
      'shared_phone', v_inq.contact_phone is not null,
      'my_side', v_side,
      'can_reply', v_inq.status not in ('closed', 'spam')
                   and (v_side = 'requester' or private.can_manage_inquiry(v_inq.id)),
      'can_manage', private.can_manage_inquiry(v_inq.id)
    ),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'side', m.sender_side, 'body', m.body, 'created_at', m.created_at,
               'mine', m.sender_id = auth.uid(),
               'sender', case m.sender_side
                           when 'requester' then coalesce(sp.display_name, 'Someone')
                           when 'provider' then coalesce(split_part(sp.display_name, ' ', 1) || ' · ', '') || o.name
                           else 'Propertiq' end)
             order by m.created_at)
        from public.inquiry_messages m left join public.profiles sp on sp.id = m.sender_id
       where m.inquiry_id = v_inq.id), '[]'::jsonb),
    'viewings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', v.id, 'status', v.status, 'start', v.requested_start, 'end', v.requested_end,
               'timezone', v.timezone, 'note', v.note, 'updated_at', v.updated_at)
             order by v.created_at desc)
        from public.viewing_requests v where v.inquiry_id = v_inq.id), '[]'::jsonb)
  ) into v_result
  from public.property_listings l
  join public.organizations o on o.id = l.organization_id
  join public.profiles rp on rp.id = v_inq.requester_id
  where l.id = v_inq.listing_id;
  return v_result;
end;
$$;
