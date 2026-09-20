-- Historical discovery query: NOT sufficient to uniquely identify the current page.
-- The same FULL ContentItemKey was found in eight different published documents.
-- Whole-site performance has not been accepted. No TOP 1; retain ambiguous results.
SELECT d.DocumentVersionKey, d.DocumentName,
       c.ci.value('declare namespace a="http://schemas.imis.com/2008/01/DataContracts/ContentItem"; (a:ContentItemName/text())[1]', 'nvarchar(200)') AS ContentItemName,
       c.ci.value('declare namespace a="http://schemas.imis.com/2008/01/DataContracts/ContentItem"; (a:ContentItemKey/text())[1]', 'uniqueidentifier') AS ContentItemKey
FROM dbo.DocumentMain AS d
CROSS APPLY (SELECT dbo.asi_getReadOnlyXmlFromBlob(d.DocumentKey) AS XmlBlob) AS b
CROSS APPLY b.XmlBlob.nodes('declare namespace x="http://schemas.imis.com/2008/01/DataContracts/Content"; declare namespace a="http://schemas.imis.com/2008/01/DataContracts/ContentItem"; /x:Content/x:ContentItems/a:ContentItem') AS c(ci)
WHERE d.DocumentTypeCode = 'CON'
  AND d.DocumentStatusCode = 40
  AND LOWER(LEFT(REPLACE(c.ci.value('declare namespace a="http://schemas.imis.com/2008/01/DataContracts/ContentItem"; (a:ContentItemKey/text())[1]', 'varchar(36)'), '-', ''), 12)) = 'a315d1c24e44';
