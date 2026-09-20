using System;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Web;
using System.Web.Routing;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using Asi.Atom;
using Asi.Business.ContentManagement;
using Asi.Business.ContentManagement.ContentType;
using Asi.Soa.Core.DataContracts;
using Asi.Soa.Core.ServiceContracts;
using Asi.Utilities;
using Asi.Web.Mvc;
using Asi.Web.UI.WebControls;
using Asi.Web.UI.WebControls.Mvc;
using Autofac;
using Autofac.Integration.Web;

namespace Asi.Web.UI;

public abstract class ContentItemDisplayBase : ExceptionHandlingContentItemBase, IDisplayContentItem
{
	private ContentItem mContentItem;

	private Content mContentRecord;

	private Button HiddenButton;

	private HiddenField HiddenField;

	internal SurfToEditButtonPanel SurfToEditPanel;

	public virtual bool DisablePageCaching { get; set; }

	public virtual string DynamicPageTitle { get; set; }

	public virtual string DynamicContentPageTitle { get; set; }

	[ExcludeFromCodeCoverage]
	public Guid ContentKey
	{
		get
		{
			return (Guid)(ViewState["ContentKey"] ?? ((object)Guid.Empty));
		}
		set
		{
			TrackViewState();
			ViewState["ContentKey"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public Guid ContentItemKey
	{
		get
		{
			return (Guid)(ViewState["ContentItemKey"] ?? ((object)Guid.Empty));
		}
		set
		{
			TrackViewState();
			ViewState["ContentItemKey"] = value;
		}
	}

	public ContentParameterCollection ContentParameters
	{
		get
		{
			//IL_0030: Unknown result type (might be due to invalid IL or missing references)
			//IL_0036: Expected O, but got Unknown
			//IL_0018: Unknown result type (might be due to invalid IL or missing references)
			//IL_001e: Expected O, but got Unknown
			if (ViewState["ContentParameters"] == null)
			{
				return new ContentParameterCollection();
			}
			return (ContentParameterCollection)ViewState["ContentParameters"];
		}
		set
		{
			TrackViewState();
			ViewState["ContentParameters"] = value;
		}
	}

	public new bool IsContentDesignMode
	{
		get
		{
			if (ViewState["DesignMode"] != null)
			{
				return (bool)ViewState["DesignMode"];
			}
			if (Page != null)
			{
				WebPartManager currentWebPartManager = WebPartManager.GetCurrentWebPartManager(Page);
				if (currentWebPartManager != null)
				{
					return currentWebPartManager.DisplayMode.AllowPageDesign;
				}
			}
			return false;
		}
		set
		{
			TrackViewState();
			ViewState["DesignMode"] = value;
			if (ShowSurfToEdit)
			{
				ShowSurfToEdit = false;
			}
			FlowdownContentDesignMode(Controls, value);
		}
	}

	public bool ShowSurfToEdit
	{
		get
		{
			if (Page is DisplayPageBase && !((DisplayPageBase)Page).SurfToEditEnabled)
			{
				return false;
			}
			if (ContentKey.Equals(Guid.Empty) || ContentItemKey.Equals(Guid.Empty))
			{
				return false;
			}
			if (IsContentDesignMode)
			{
				return false;
			}
			if (ContentItem != null && ContentRecord != null && ((AtomBaseSerializationNeutral)ContentRecord).Document != null && ((AtomBaseSerializationNeutral)ContentRecord).Document.IsSystem)
			{
				return false;
			}
			if (ViewState["ShowSurfToEdit"] == null)
			{
				return true;
			}
			return (bool)ViewState["ShowSurfToEdit"];
		}
		set
		{
			if (Page is DisplayPageBase && DisplayPageBase.PreviewMode)
			{
				value = false;
			}
			TrackViewState();
			ViewState["ShowSurfToEdit"] = value;
		}
	}

	public bool HideContent
	{
		get
		{
			if (ViewState["HideContent"] != null && bool.TryParse(ViewState["HideContent"].ToString(), out var result))
			{
				return result;
			}
			return false;
		}
		set
		{
			ViewState["HideContent"] = value;
			if (value)
			{
				base.ShowBorder = false;
				base.ShowTitle = false;
				if (ShowSurfToEdit)
				{
					Controls.Clear();
					AddSurfToEdit();
				}
			}
		}
	}

	public ContentItem ContentItem
	{
		get
		{
			if (mContentItem != null)
			{
				return mContentItem;
			}
			if (ContentItemKey.Equals(Guid.Empty))
			{
				ContentItemKey = Guid.NewGuid();
			}
			if (ContentRecord == null)
			{
				return null;
			}
			if (ContentRecord.Items.ContainsKey(ContentItemKey))
			{
				mContentItem = ContentRecord.Items[ContentItemKey];
			}
			else
			{
				mContentItem = CreateContentItem();
				if (mContentItem != null)
				{
					mContentItem.ContentItemKey = ContentItemKey;
					mContentItem.ContentItemName = "New " + ((object)mContentItem).GetType().Name;
					Guid contentKey = (mContentItem.ContentKey = ContentRecord.ContentKey);
					ContentKey = contentKey;
					((ModifiedCollection<ContentItem>)(object)ContentRecord.Items).Add(mContentItem);
				}
			}
			return mContentItem;
		}
		set
		{
			mContentItem = value;
			ContentKey = value.ContentKey;
			ContentItemKey = value.ContentItemKey;
		}
	}

	public Content ContentRecord
	{
		get
		{
			if (mContentRecord == null)
			{
				mContentRecord = Content.GetFromContentKey(ContentKey, base.Container, !IsContentDesignMode, !IsContentDesignMode);
			}
			return mContentRecord;
		}
	}

	protected bool DocumentDownloadLinksEnabled { get; set; } = false;

	private string JavascriptManagerVar => string.Format(CultureInfo.InvariantCulture, "window['{0}_jsmanager']", ClientID);

	private IDocumentService DocumentService { get; set; }

	[ExcludeFromCodeCoverage]
	private static void FlowdownContentDesignMode(ControlCollection controls, bool value)
	{
		foreach (Control control in controls)
		{
			IDisplayContentItem val = (IDisplayContentItem)(object)((control is IDisplayContentItem) ? control : null);
			if (val != null)
			{
				val.IsContentDesignMode = value;
			}
			else
			{
				FlowdownContentDesignMode(control.Controls, value);
			}
		}
	}

	public abstract ContentItem CreateContentItem();

	private void AssignDownloadFileLinksToButton()
	{
		if (!IsContentDesignMode)
		{
			HttpApplication obj = HttpContext.Current?.ApplicationInstance;
			IContainerProviderAccessor val = (IContainerProviderAccessor)(object)((obj is IContainerProviderAccessor) ? obj : null);
			if (val != null)
			{
				IContainerProvider containerProvider = val.ContainerProvider;
				DocumentService = ResolutionExtensions.Resolve<IDocumentService>((IComponentContext)(object)containerProvider.RequestLifetime);
			}
			CreateDownloadButtonForLinks();
			SetupJavascript();
		}
	}

	private void SetupJavascript()
	{
		if (Page != null)
		{
			ScriptManager.RegisterClientScriptResource(ScriptManager.GetCurrent(Page), typeof(ContentItemDisplayBase), "Asi.Web.UI.WebControls.DownloadDocument.js");
		}
		string script = string.Format(CultureInfo.InvariantCulture, "if(typeof({0})==='undefined') {{\r\n                     {0}=new Asi_WebRoot_AsiCommon_ContentManagement_DownloadDocument();              \r\n                     }}", JavascriptManagerVar);
		ScriptManager.RegisterStartupScript(Page, Page.GetType(), ClientID + "_jsmanager", script, addScriptTags: true);
		string script2 = string.Format(CultureInfo.InvariantCulture, "if(typeof({0})!=='undefined') {{ {0}.OnLoad('#{1}','#{2}'); }}", JavascriptManagerVar, HiddenButton.ClientID, HiddenField.ClientID);
		ScriptManager.RegisterStartupScript(Page, Page.GetType(), "SetFileDownloadLinkHandler_" + ClientID, script2, addScriptTags: true);
	}

	private void CreateDownloadButtonForLinks()
	{
		HiddenField = new HiddenField
		{
			ID = "HiddenDownloadPathField"
		};
		HiddenButton = new Button
		{
			CausesValidation = false,
			ID = "downloadButton"
		};
		HiddenButton.Click += HiddenButtonOnClick;
		HiddenButton.Attributes.Add("style", "display:none");
		WebControl webControl = new WebControl(HtmlTextWriterTag.Div)
		{
			ID = "downloadContainer"
		};
		webControl.Style.Add("display", "none");
		Controls.Add(webControl);
		webControl.Controls.Add(HiddenField);
		webControl.Controls.Add(HiddenButton);
	}

	private void HiddenButtonOnClick(object sender, EventArgs eventArgs)
	{
		string text = HiddenField.Value.Replace("%20", " ");
		string path = "$/Common/" + text;
		if (string.IsNullOrEmpty(text) || !text.ToLowerInvariant().StartsWith("uploaded files"))
		{
			AddUserMessage(new UserControlMessage(UserControlMessageTypes.Error, "Unable to retrieve file - path not found"));
			return;
		}
		DocumentData val = RetrieveDocument(path);
		if (val != null)
		{
			DownloadDocument(val);
		}
	}

	private void DownloadDocument(DocumentData doc)
	{
		base.Response.Clear();
		base.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + ((DocumentSummaryData)doc).Name + "\"");
		base.Response.AddHeader("Content-Length", doc.Data.Length.ToString());
		base.Response.ContentType = "application/octet-stream";
		base.Response.BinaryWrite(doc.Data);
		base.Response.Flush();
		base.Response.End();
	}

	private DocumentData RetrieveDocument(string path)
	{
		DocumentData val = DocumentService.FindByPath(path, (RequestedPublishingState)1);
		if (val == null)
		{
			AddUserMessage(new UserControlMessage(UserControlMessageTypes.Error, "Unable to retrieve file"));
			return null;
		}
		return val;
	}

	protected virtual bool DownloadFileLinkPresent()
	{
		return true;
	}

	private void AddSurfToEdit()
	{
		if (SurfToEditPanel != null)
		{
			if (!Controls.Contains(SurfToEditPanel))
			{
				try
				{
					Controls.Add(SurfToEditPanel);
				}
				catch (HttpException)
				{
				}
				catch (ArgumentNullException)
				{
				}
			}
		}
		else if (!(ContentKey == Guid.Empty) && !(ContentItemKey == Guid.Empty))
		{
			SurfToEditPanel = new SurfToEditButtonPanel
			{
				ContentKey = ContentKey,
				ContentItemKey = ContentItemKey
			};
			Controls.Add(SurfToEditPanel);
		}
	}

	public sealed override void RenderWebPart(HtmlTextWriter writer)
	{
		if ((HideContent && !ShowSurfToEdit) || writer == null)
		{
			return;
		}
		writer.WriteBeginTag("div");
		if (ContentKey != Guid.Empty)
		{
			writer.WriteAttribute("id", "ste_container_" + ID);
		}
		if (HideContent && ShowSurfToEdit)
		{
			writer.WriteAttribute("class", "NoContentSTEContainer");
		}
		else if (Page is DisplayPageBase && ((DisplayPageBase)Page).SurfToEditEnabled && SurfToEditPanel != null)
		{
			writer.WriteAttribute("class", "ContentItemContainer EasyEditContent");
		}
		else
		{
			writer.WriteAttribute("class", "ContentItemContainer");
		}
		writer.Write('>');
		if (ContentItem != null && ContentItem is MvcContentItem mvcContentItem)
		{
			HtmlString mvcContentItemHtml = GetMvcContentItemHtml(mvcContentItem);
			writer.Write(mvcContentItemHtml);
		}
		if (ContentItem is ClientSideContentItem)
		{
			if (this is iPartDisplayBase)
			{
				((iPartDisplayBase)this).InjectedHtml.Text = GetMvvmContentItemHtml(ContentItem);
			}
			else
			{
				writer.Write(GetMvvmContentItemHtml(ContentItem));
			}
		}
		Render(writer);
		if (ContentItem != null && IsContentDesignMode && ContentItem.ContentType.Type != null && !ContentItem.ContentType.Type.Name.ToUpperInvariant().Contains("CONTENTCOLLECTIONORGANIZER"))
		{
			string arg = $"#ste_container_{ID} a";
			string arg2 = $"jQuery(\"{arg}\").css({{\"opacity\":\"0.55\",\"filter\":\"alpha(opacity=55.0)\",cursor:\"default\"}}).click(function(e){{e.preventDefault();}});";
			string value = $"Sys.Application.add_load(function() {{ {arg2} }})";
			writer.WriteBeginTag("script");
			writer.WriteAttribute("type", "text/javascript");
			writer.Write('>');
			writer.Write(value);
			writer.WriteEndTag("script");
		}
		writer.WriteEndTag("div");
	}

	private HtmlString GetMvcContentItemHtml(MvcContentItem mvcContentItem)
	{
		RouteData contentItemRouteData = MvcUtility.GetContentItemRouteData(mvcContentItem);
		return MvcUtility.RenderViewToString(contentItemRouteData);
	}

	private string GetMvvmContentItemHtml(ContentItem contentItem)
	{
		PathProvider pathProvider = new PathProvider(new HttpServerUtilityWrapper(base.Server));
		HtmlDocumentLoader documentLoader = new HtmlDocumentLoader();
		MvvmUtility mvvmUtility = new MvvmUtility(IsContentDesignMode, pathProvider, documentLoader);
		return mvvmUtility.DisplayHtml(contentItem);
	}

	[ExcludeFromCodeCoverage]
	public sealed override void CreateWebPartChildControls()
	{
		CreateChildControls();
	}

	[ExcludeFromCodeCoverage]
	public sealed override void InitWebPart(EventArgs e)
	{
		OnInit(e);
	}

	[ExcludeFromCodeCoverage]
	public sealed override void PreRenderWebPart(EventArgs e)
	{
		if (SurfToEditPanel != null)
		{
			SurfToEditPanel.ShowSurfToEdit = ShowSurfToEdit;
		}
		OnPreRender(e);
	}

	public sealed override void LoadWebPart(EventArgs e)
	{
		AddSurfToEdit();
		OnLoad(e);
	}

	[ExcludeFromCodeCoverage]
	protected new virtual void Render(HtmlTextWriter writer)
	{
		base.SurfToEditEnabled = ShowSurfToEdit;
		base.RenderWebPart(writer);
	}

	[ExcludeFromCodeCoverage]
	protected new virtual void CreateChildControls()
	{
		base.CreateWebPartChildControls();
	}

	[ExcludeFromCodeCoverage]
	protected new virtual void OnInit(EventArgs e)
	{
		base.InitWebPart(e);
		if (DocumentDownloadLinksEnabled && DownloadFileLinkPresent())
		{
			AssignDownloadFileLinksToButton();
		}
	}

	[ExcludeFromCodeCoverage]
	protected new virtual void OnLoad(EventArgs e)
	{
		if (DisablePageCaching)
		{
			base.Response.CacheControl = "no-cache";
		}
		base.LoadWebPart(e);
	}

	[ExcludeFromCodeCoverage]
	protected new virtual void OnPreRender(EventArgs e)
	{
		if (ShouldAddDynamicTextToTitle(DynamicPageTitle))
		{
			Page.Title = string.Format(CultureInfo.CurrentCulture, "{0} - {1}", Page.Title, DynamicPageTitle);
			((DisplayPageBase)Page).ShouldTranslatePageTitle = false;
		}
		if (ShouldAddDynamicTextToTitle(DynamicContentPageTitle))
		{
			Page.Title = string.Format(CultureInfo.CurrentCulture, "{0} - {1}", Page.Title, DynamicContentPageTitle);
		}
		base.PreRenderWebPart(e);
	}

	private bool ShouldAddDynamicTextToTitle(string titleText)
	{
		if (string.IsNullOrEmpty(titleText))
		{
			return false;
		}
		if (HideContent || IsContentDesignMode)
		{
			return false;
		}
		if (Page == null || Page.Title == null || Page.Title.Contains(titleText))
		{
			return false;
		}
		if (ContentItem == null || ContentRecord == null || !ContentRecord.UseDynamicPageTitle)
		{
			return false;
		}
		return true;
	}
}
