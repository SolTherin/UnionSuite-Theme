SELECT 
	P.ID,
	P.StartDate,
	P.EndDate,
	P.Type AS TypeCode,
	LType.Description AS Type,
	P.Status AS StatusCode,
	LStatus.Description AS Status,

	P.Reason AS ReasonCode,
	LReason.Label AS Reason,

	P.subtype AS SubtypeCode,
	LSubtype.Description AS Subtype,

	P.*,
	CreatedAt,
	1
FROM [UnionTemplate].[PME] p
LEFT JOIN [UnionTemplate].[Lookup] LStatus 
	on p.status = LStatus.id 
	and LStatus.type = 'AdjustmentStatus'
LEFT JOIN [UnionTemplate].[Lookup] LType 
	on p.type= LType.id 
	and LType.type = 'AdjustmentType'
LEFT JOIN [UnionTemplate].[Lookup] LSubtype 
	on p.subtype = LSubtype.id 
	and LSubtype.type = 'AdjustmentSubType'
LEFT JOIN UnionTemplate.GenLookups LReason
	on P.Reason = LReason.Code 
	and LReason.Type = 'I4U_AM_WAIVER_CATEGORIES'
WHERE P.Type = 1
ORDER BY P.Subtype, P.CreatedAt



--select * from  [UnionTemplate].[Lookup] where type = 'AdjustmentSubType' 

-- waiver
	-- waiver amount
		-- percentage
		-- fixed

-- membership change
	-- original -> New fields

-- credit
	