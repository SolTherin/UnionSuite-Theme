using System;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Runtime.Serialization;
using System.Web.UI.WebControls;
using Asi.Atom;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Business.ContentManagement.ContentType;

namespace Asi.Web.iParts.Website.ContentDisplay;

[DataContract(Name = "ContentDisplay")]
public class ContentDisplayCommon : iPartCommonBase
{
	private readonly bool mIsNew;

	private Guid contentRecordKey;

	public override Guid ContentTypeKey => new Guid("680d926b-3294-4d74-9cd5-2b99199e6568");

	public override bool IsNew => mIsNew;

	[DataMember(Name = "ContentRecordKey")]
	public Guid ContentRecordKey
	{
		get
		{
			return contentRecordKey;
		}
		set
		{
			contentRecordKey = value;
		}
	}

	[DataMember(Name = "ContentRecordPath")]
	public string ContentRecordPath { get; set; }

	[DataMember(Name = "DisplayOn")]
	public string DisplayOn { get; set; }

	[DataMember(Name = "HonorContentRecordLayout")]
	public bool HonorContentRecordLayout { get; set; }

	[ExcludeFromCodeCoverage]
	public Content ContentRecordDocument
	{
		get
		{
			if (ContentRecordKey == Guid.Empty)
			{
				return null;
			}
			return ContentRecordKey.Equals(Guid.Empty) ? null : Content.GetFromContentKey(ContentRecordKey, ((AtomBaseSerializationNeutral)this).BusinessContainer, true);
		}
	}

	public ContentDisplayCommon()
	{
		mIsNew = true;
		DisplayOn = "All";
		HonorContentRecordLayout = false;
	}

	public ContentDisplayCommon(Guid contentKey)
		: base(contentKey)
	{
	}

	public override ContentParameterCollection GetCurrentParameterValues()
	{
		ContentParameterCollection currentParameterValues = ((iPartCommonBase)this).GetCurrentParameterValues();
		currentParameterValues.Add("ContentRecordPath", (object)(ContentRecordPath ?? string.Empty));
		currentParameterValues.Add("ContentRecordKey", (object)ContentRecordKey);
		currentParameterValues.Add("DisplayOn", (object)DisplayOn);
		currentParameterValues.Add("HonorContentRecordLayout", (object)HonorContentRecordLayout);
		return currentParameterValues;
	}

	public override void ConfigureAtomProperty(AtomProperty ap)
	{
		//IL_00da: Unknown result type (might be due to invalid IL or missing references)
		//IL_00df: Unknown result type (might be due to invalid IL or missing references)
		//IL_00fa: Unknown result type (might be due to invalid IL or missing references)
		//IL_00ff: Unknown result type (might be due to invalid IL or missing references)
		//IL_011a: Unknown result type (might be due to invalid IL or missing references)
		//IL_011f: Unknown result type (might be due to invalid IL or missing references)
		if (ap == null)
		{
			throw new ArgumentNullException("ap");
		}
		((iPartCommonBase)this).ConfigureAtomProperty(ap);
		switch (ap.Name)
		{
		case "ContentRecordPath":
			ap.Caption = ResourceManager.GetPhrase("iPart.Website.ContentDisplay.Content", "Content");
			ap.Required = true;
			ap.HIControlType = (AtomHIControlType)21;
			ap.StartingPathDocumentVersionKey = DocumentSystem.DocumentKeyByPath("@");
			break;
		case "DisplayOn":
		{
			ap.Caption = ResourceManager.GetPhrase("iPart.Website.ContentDisplay.DisplayOn", "Display on");
			ap.Required = true;
			ap.HIControlRepeatDirection = RepeatDirection.Horizontal;
			ap.HIControlType = (AtomHIControlType)9;
			StringPair[] valueList = (StringPair[])(object)new StringPair[3]
			{
				new StringPair(ResourceManager.GetPhrase("AllPages", "All pages"), "All"),
				new StringPair(ResourceManager.GetPhrase("HomepageOnly", "Homepage only"), "Homepage"),
				new StringPair(ResourceManager.GetPhrase("InteriorOnly", "Interior pages only"), "Interior")
			};
			ap.ValueList = valueList;
			break;
		}
		case "HonorContentRecordLayout":
			ap.Caption = ResourceManager.GetPhrase("iPart.Website.ContentDisplay.HonorContentRecordLayout", "Honor content record layout");
			ap.HIControlType = (AtomHIControlType)0;
			break;
		}
	}

	public static string VerifyContent(string contentPath)
	{
		string result = string.Empty;
		if (!string.IsNullOrEmpty(contentPath))
		{
			try
			{
				Document val = DocumentController.Document(contentPath);
				if (val == null || !val.DocumentTypeCode.Equals("CON"))
				{
					result = string.Format(CultureInfo.CurrentCulture, ResourceManager.GetPhrase("IncorrectContent", "Incorrect or unknown content. Please verify that the content: {0} exists and (or) you have enough permissions to access it."), contentPath);
				}
			}
			catch (NullReferenceException ex)
			{
				result = string.Format(CultureInfo.CurrentCulture, ResourceManager.GetPhrase("UnableToLoadContent", "Unable to load content. Details: ") + "{0}<br/>", ex.Message);
			}
		}
		else
		{
			result = ResourceManager.GetPhrase("SelectContentToContinue", "Select content to continue").ToString(CultureInfo.CurrentCulture);
		}
		return result;
	}
}
