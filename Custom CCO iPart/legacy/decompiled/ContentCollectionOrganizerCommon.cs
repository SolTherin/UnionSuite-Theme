using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;
using System.Web.UI.WebControls;
using Asi.Atom;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Business.ContentManagement.ContentType;
using Asi.Soa.ClientServices;
using Asi.Web.iParts.Common.ContentCollectionOrganizer.Common;

namespace Asi.Web.iParts.Common.ContentCollectionOrganizer;

[DataContract(Name = "ContentCollectionOrganizerCommon")]
public class ContentCollectionOrganizerCommon : iPartCommonBase
{
	[ExcludeFromCodeCoverage]
	public override Guid ContentTypeKey => new Guid("8e57d569-8967-484e-aac5-21bfbc14ecc4");

	[Obsolete("Use PartTitle instead")]
	[DataMember(Name = "PageTitle")]
	public string PageTitle
	{
		get
		{
			return ((iPartCommonBase)this).PartTitle;
		}
		set
		{
			((iPartCommonBase)this).PartTitle = value;
		}
	}

	[DataMember(Name = "DoNotRenderInDesignMode")]
	public bool DoNotRenderInDesignMode
	{
		get
		{
			return ((iPartCommonBase)this).DoNotRenderInDesignMode;
		}
		set
		{
			((iPartCommonBase)this).DoNotRenderInDesignMode = value;
		}
	}

	[DataMember(Name = "ShowBorder")]
	public bool ShowBorder
	{
		get
		{
			return ((iPartCommonBase)this).ShowBorder;
		}
		set
		{
			((iPartCommonBase)this).ShowBorder = value;
		}
	}

	[DataMember(Name = "WizardMode")]
	[ExcludeFromCodeCoverage]
	public bool WizardMode { get; set; }

	[DataMember(Name = "UseContentFolder")]
	[ExcludeFromCodeCoverage]
	public bool UseContentFolder { get; set; }

	[DataMember(Name = "ContentFolder")]
	public string ContentFolder { get; set; }

	[DataMember(Name = "ContentFolderKey")]
	public Guid ContentFolderKey { get; set; }

	[DataMember(Name = "SequentialSteps")]
	[ExcludeFromCodeCoverage]
	public bool SequentialSteps { get; set; }

	[DataMember(Name = "DisplayStyle")]
	[ExcludeFromCodeCoverage]
	public DisplayStyle DisplayStyle { get; set; }

	[DataMember(Name = "TabbedDialogSettings")]
	[ExcludeFromCodeCoverage]
	public string TabbedDialogSettings { get; set; }

	[DataMember(Name = "URLKeyName")]
	[ExcludeFromCodeCoverage]
	public string URLKeyName { get; set; }

	[DataMember(Name = "UrlRedirect")]
	[ExcludeFromCodeCoverage]
	public string UrlRedirect { get; set; }

	[DataMember(Name = "RedirectOnFinish")]
	[ExcludeFromCodeCoverage]
	public bool RedirectOnFinish { get; set; }

	[DataMember(Name = "RedirectLocation")]
	public string RedirectLocation
	{
		get
		{
			return RedirectOnFinish ? RedirectTo.ContentOrUrl.ToString() : RedirectTo.DoNotRedirect.ToString();
		}
		set
		{
		}
	}

	[DataMember(Name = "IncludeIdAsQuerystringParameter")]
	[ExcludeFromCodeCoverage]
	public bool IncludeIdAsQuerystringParameter { get; set; }

	[ExcludeFromCodeCoverage]
	public ContentCollectionOrganizerCommon()
	{
	}

	[ExcludeFromCodeCoverage]
	public ContentCollectionOrganizerCommon(Guid contentKey)
		: base(contentKey)
	{
	}

	public override ContentParameterCollection GetCurrentParameterValues()
	{
		ContentParameterCollection currentParameterValues = ((iPartCommonBase)this).GetCurrentParameterValues();
		currentParameterValues.Add("WizardMode", (object)WizardMode);
		currentParameterValues.Add("UseContentFolder", (object)UseContentFolder);
		currentParameterValues.Add("ContentFolder", (object)(ContentFolder ?? string.Empty));
		currentParameterValues.Add("ContentFolderKey", (object)ContentFolderKey);
		currentParameterValues.Add("SequentialSteps", (object)SequentialSteps);
		currentParameterValues.Add("DisplayStyle", (object)DisplayStyle);
		currentParameterValues.Add("URLKeyName", (object)((!string.IsNullOrEmpty(URLKeyName)) ? URLKeyName : ((ContentItem)this).ContentItemName));
		currentParameterValues.Add("TabbedDialogSettings", (object)(TabbedDialogSettings ?? string.Empty));
		currentParameterValues.Add("UrlRedirect", (object)(UrlRedirect ?? string.Empty));
		currentParameterValues.Add("RedirectLocation", (object)RedirectLocation);
		currentParameterValues.Add("RedirectOnFinish", (object)RedirectOnFinish);
		currentParameterValues.Add("IncludeIdAsQuerystringParameter", (object)IncludeIdAsQuerystringParameter);
		return currentParameterValues;
	}

	public override void ConfigureAtomProperty(AtomProperty ap)
	{
		//IL_03e5: Unknown result type (might be due to invalid IL or missing references)
		if (ap == null)
		{
			throw new ArgumentNullException("ap");
		}
		((iPartCommonBase)this).ConfigureAtomProperty(ap);
		switch (ap.Name)
		{
		case "WizardMode":
			ap.Caption = ResourceManager.GetPhrase("iPart.ContentCollectionOrganizer.WizardMode", "Function as wizard");
			ap.ToolTip = ResourceManager.GetPhrase("iPart.ContentCollectionOrganizer.WizardMode_Tooltip", "Select to display the iPart as a workflow (wizard). If not selected, the iPart displays tabs for content items.");
			ap.Required = false;
			break;
		case "UseContentFolder":
			ap.Caption = ResourceManager.GetPhrase("iPart.ContentCollectionOrganizer.UseContentFolder", "Use content folder to define tabs");
			ap.Required = false;
			break;
		case "ContentFolder":
			ap.Caption = ResourceManager.GetPhrase("iPart.ContentCollectionOrganizer.ContentFolder", "Source folder");
			ap.Required = false;
			ap.HIControlType = (AtomHIControlType)21;
			ap.StartingPathDocumentVersionKey = DocumentSystem.DocumentKeyByPath("@");
			ap.InputFieldCssClass = "InputXLargeWrapper";
			break;
		case "SequentialSteps":
			ap.Caption = ResourceManager.GetPhrase("iPart.ContentCollectionOrganizer.SequentialSteps", "Steps must be sequential");
			ap.Required = false;
			break;
		case "DisplayStyle":
		{
			ap.Required = true;
			ap.Paintable = true;
			ap.Caption = ResourceManager.GetPhrase("iPart.ContentCollectionOrganizer.DisplayStyle", "Display style");
			ap.HIControlRepeatDirection = RepeatDirection.Vertical;
			ap.HIControlType = (AtomHIControlType)1;
			StringPair[] array = null;
			string[] names = Enum.GetNames(typeof(DisplayStyle));
			foreach (string text in names)
			{
				if ((bool)CommonCode.GetEnumValueByType((DisplayStyle)Enum.Parse(typeof(DisplayStyle), text), typeof(ImplementedAttribute)))
				{
					if (array == null)
					{
						array = (StringPair[])(object)new StringPair[1];
					}
					else
					{
						Array.Resize(ref array, array.Length + 1);
					}
					((StringPair)(ref array[array.Length - 1])).Second = text;
					((StringPair)(ref array[array.Length - 1])).First = (string)CommonCode.GetEnumValueByType((DisplayStyle)Enum.Parse(typeof(DisplayStyle), text), typeof(DisplayTextAttribute));
				}
			}
			ap.ValueList = array;
			break;
		}
		case "TabbedDialogSettings":
			break;
		case "UrlRedirect":
			ap.Caption = ResourceManager.GetPhrase("Asi.Web.iParts.UrlRedirect", "Content or URL to redirect to");
			ap.MaxLength = 255;
			ap.Required = false;
			ap.HIControlType = (AtomHIControlType)21;
			ap.StartingPathDocumentVersionKey = new Guid("925EF7AE-CAE2-41C3-BB4D-B13C17EBD928");
			ap.InputFieldCssClass = "InputXLargeWrapper";
			break;
		case "RedirectOnFinish":
			ap.Caption = ResourceManager.GetPhrase("Asi.Web.iParts.RedirectOnFinish", "Redirect on finish");
			break;
		case "IncludeIdAsQuerystringParameter":
		{
			string phrase = ResourceManager.GetPhrase("Asi.Web.iParts.IncludeIdAsQuerystringParameter", "Include ID as a URL parameter");
			if (!new EntityManager().IsV10)
			{
				phrase = ResourceManager.GetPhrase("Asi.Web.iParts.IncludeContactKeyAsQuerystringParameter", "Include ContactKey as a URL parameter");
			}
			ap.Caption = phrase;
			break;
		}
		}
	}
}
