// iMIS wrappers shared by the runtime and the native JsonSettings editor.
export function unwrap(value) {
  return value && typeof value === 'object' && '$value' in value ? value.$value : value;
}

export function objectValue(value, label = 'value') {
  value = unwrap(value);
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { throw new Error(`${label} is invalid JSON.`); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value;
}

export function collection(value, label) {
  const rows = unwrap(value)?.$values ?? unwrap(value);
  if (!Array.isArray(rows)) throw new Error(`Unexpected ${label} response.`);
  return rows;
}

export function property(record, name) {
  if (record[name] !== undefined) return unwrap(record[name]);
  const props = record.Properties?.$values ?? record.Properties;
  return Array.isArray(props) ? unwrap(props.find(p => p.Name === name)?.Value) : undefined;
}

export function guid(value, label = 'Key') {
  value = unwrap(value);
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) || /^0{8}(?:-0{4}){3}-0{12}$/.test(value)) {
    throw new Error(`${label} must be a non-empty GUID. Check iMIS token substitution and configuration.`);
  }
  return value.toLowerCase();
}

export function placementIdentity(contentKey, contentItemKey) {
  return { contentKey: guid(contentKey, 'ContentKey'), contentItemKey: guid(contentItemKey, 'ContentItemKey') };
}

export function placementId(identity) {
  return `${identity.contentKey.replaceAll('-', '')}-${identity.contentItemKey.replaceAll('-', '')}`;
}

export function verifiedPlacement(body, identity) {
  const envelope = objectValue(body, 'ContentItem');
  const rows = envelope.Items !== undefined ? collection(envelope.Items, 'ContentItem list') : [envelope];
  const matches = rows.filter(row => {
    const record = objectValue(row, 'ContentItem row');
    const data = record.Data === undefined ? {} : objectValue(record.Data, 'ContentItem Data');
    // Reject conflicts between direct, Data and property-bag identities; never trust a filter alone.
    return [['ContentKey', identity.contentKey], ['ContentItemKey', identity.contentItemKey]].every(([name, expected]) => {
      const values = [data, record].flatMap(owner => {
        const props = owner.Properties?.$values ?? owner.Properties;
        return [unwrap(owner[name]), ...(Array.isArray(props) ? props.filter(p => p.Name === name).map(p => unwrap(p.Value)) : [])];
      }).filter(v => v !== undefined);
      return values.length > 0 && values.every(v => typeof v === 'string' && v.toLowerCase() === expected);
    });
  });
  if (matches.length !== 1) throw new Error('Configuration lookup did not return exactly one matching ContentKey + ContentItemKey placement.');
  return objectValue(matches[0]);
}

export function placementSettings(row) {
  const data = row.Data === undefined ? {} : objectValue(row.Data);
  for (const owner of [data, row]) {
    for (const name of ['JsonSettings', 'Settings']) {
      const candidate = property(owner, name);
      if (candidate !== undefined && candidate !== null && candidate !== '') return objectValue(candidate, name);
    }
  }
  throw new Error('No JsonSettings configuration was found. Configure this UnionSuite CCO placement.');
}

export function validateConfig(input) {
  const value = objectValue(input, 'JsonSettings');
  if (value.schemaVersion !== 1) throw new Error('Unsupported or missing CCO schemaVersion. Reopen the configuration editor.');
  const textSetting = (key, fallback, max) => {
    const text = value[key] ?? fallback;
    if (typeof text !== 'string' || text.length > max) throw new Error(`Invalid ${key}.`);
    return text.trim();
  };
  const preload = value.preload ?? 'off';
  if (!['off', 'sequential-idle'].includes(preload)) throw new Error('Unsupported preload policy.');
  if (value.popupBridge !== undefined && typeof value.popupBridge !== 'boolean') throw new Error('popupBridge must be true or false.');
  if (value.orientation !== undefined && !['horizontal', 'vertical'].includes(value.orientation)) throw new Error('Unsupported tab orientation.');
  const urlParameter = textSetting('urlParameter', '', 60);
  if (urlParameter && (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(urlParameter) || /^(?:id|contactid|partyid|customerid|context|websitekey|contentkey|contentitemkey|templatetype|imode|iuniformkey|ioperation|documenttypecode|dialogcacheparam|ispopup|popup|pageinstancekey|donotcache|us-cco-)/i.test(urlParameter))) throw new Error('Choose a URL parameter such as Directory; identity and renderer parameters are reserved.');
  const urlValue = value.urlValue ?? 'name';
  if (!['key', 'name', 'number'].includes(urlValue)) throw new Error('Unsupported tab URL value format.');
  return {
    schemaVersion: 1,
    urlParameter, urlValue,
    folderDocumentVersionId: guid(value.folderDocumentVersionId, 'Folder document-version key'),
    folderPathLabel: textSetting('folderPathLabel', '', 500),
    caption: textSetting('caption', 'Content pages', 120) || 'Content pages',
    initialDocumentVersionId: value.initialDocumentVersionId ? guid(value.initialDocumentVersionId, 'Initial page key') : '',
    orientation: value.orientation ?? 'vertical', preload, popupBridge: value.popupBridge ?? false
  };
}

export function mergeConfig(existing, edits) {
  const original = objectValue(existing, 'Existing JsonSettings');
  if (original.schemaVersion !== undefined && original.schemaVersion !== 1) throw new Error('Unsupported existing schemaVersion. It was not overwritten.');
  return { ...original, ...validateConfig({ ...original, ...edits, schemaVersion: 1 }) };
}
