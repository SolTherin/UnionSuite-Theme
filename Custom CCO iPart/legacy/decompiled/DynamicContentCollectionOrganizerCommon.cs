using System;
using System.Runtime.Serialization;
using Asi.Atom;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Business.ContentManagement.ContentType;

namespace Asi.Web.iParts.Common.ContentCollectionOrganizer;

[DataContract(Name = "DynamicContentCollectionOrganizer")]
public class DynamicContentCollectionOrganizerCommon : iPartCommonBase
{
	private readonly bool mIsNew;

	public override Guid ContentTypeKey => new Guid("abf56a5e-97e1-4bba-a4ed-e2eb28d355a0");

	public override bool IsNew => mIsNew;

	[DataMember(Name = "SourceFolder")]
	public string SourceFolder { get; set; }

	[DataMember(Name = "SourceKey")]
	public Guid SourceKey { get; set; }

	[DataMember(Name = "DefaultSourceFolder")]
	public string DefaultSourceFolder { get; set; }

	[DataMember(Name = "DefaultSourceKey")]
	public Guid DefaultSourceKey { get; set; }

	public DynamicContentCollectionOrganizerCommon()
	{
		mIsNew = true;
	}

	public DynamicContentCollectionOrganizerCommon(Guid contentKey)
		: base(contentKey)
	{
	}

	public override ContentParameterCollection GetCurrentParameterValues()
	{
		ContentParameterCollection currentParameterValues = ((iPartCommonBase)this).GetCurrentParameterValues();
		currentParameterValues.Add("SourceFolder", (object)(SourceFolder ?? string.Empty));
		currentParameterValues.Add("SourceKey", (object)SourceKey);
		currentParameterValues.Add("DefaultSourceFolder", (object)(DefaultSourceFolder ?? string.Empty));
		currentParameterValues.Add("DefaultSourceKey", (object)DefaultSourceKey);
		return currentParameterValues;
	}

	public override void ConfigureAtomProperty(AtomProperty ap)
	{
		if (ap == null)
		{
			throw new ArgumentNullException("ap");
		}
		((iPartCommonBase)this).ConfigureAtomProperty(ap);
		string name = ap.Name;
		if (!(name == "SourceFolder"))
		{
			if (name == "DefaultSourceFolder")
			{
				ap.Caption = ResourceManager.GetPhrase("DefaultSourceFolder", "Default source folder");
				ap.HIControlType = (AtomHIControlType)21;
				ap.StartingPathDocumentVersionKey = DocumentSystem.DocumentKeyByPath("@");
			}
		}
		else
		{
			ap.Caption = ResourceManager.GetPhrase("SourceFolder", "Source folder");
			ap.Required = true;
			ap.HIControlType = (AtomHIControlType)21;
			ap.StartingPathDocumentVersionKey = DocumentSystem.DocumentKeyByPath("@");
		}
	}
}
