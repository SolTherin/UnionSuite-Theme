using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Xml;
using Asi.Atom;
using Asi.Business;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Business.ContentManagement.ContentType;
using Asi.Core.Performance;
using Asi.Security;
using Asi.Soa.Core.Attributes;
using Asi.Utilities;
using Asi.Xml;

namespace Asi.Web.UI.WebControls;

[ParseChildren(false)]
[ExcludeFromCodeCoverage]
public class ContentTemplateArea : System.Web.UI.UserControl
{
	private readonly Panel buttonPanel = new Panel();

	private readonly Literal requestChangeButton = new Literal();

	private Content templateContent;

	private string navigationContentAttributes;

	private readonly List<IDisplayContentItem> displayControls = new List<IDisplayContentItem>();

	private const string templateContentCacheName = "TemplateContent";

	public string TemplateAreaName
	{
		get
		{
			if (ViewState["TemplateAreaName"] == null)
			{
				return string.Empty;
			}
			return (string)ViewState["TemplateAreaName"];
		}
		set
		{
			ViewState["TemplateAreaName"] = value;
		}
	}

	public bool HonorContentRecordLayout
	{
		get
		{
			if (ViewState["HonorContentRecordLayout"] == null)
			{
				return false;
			}
			return (bool)ViewState["HonorContentRecordLayout"];
		}
		set
		{
			ViewState["HonorContentRecordLayout"] = value;
		}
	}

	public Guid DocumentVersionKey
	{
		get
		{
			if (ViewState["DocumentVersionKey"] == null)
			{
				return Guid.Empty;
			}
			return (Guid)ViewState["DocumentVersionKey"];
		}
		set
		{
			ViewState["DocumentVersionKey"] = value;
		}
	}

	protected override void CreateChildControls()
	{
		base.CreateChildControls();
		if (!(Page is DisplayPageBase { iMISWebsite: var val } displayPageBase))
		{
			return;
		}
		Guid guid = default(Guid);
		if (val == null && TypeConverter.GuidTryParse(DisplayPageBase.WebsiteKey, ref guid))
		{
			val = Website.GetFromWebsiteKey(guid, AppContext.CurrentContext.StatefulBusinessContainer);
		}
		if (val == null)
		{
			return;
		}
		if (displayPageBase.IsHomePage)
		{
			Guid guid2 = val.HomePageHierarchyKey.GetValueOrDefault();
			if (guid2.Equals(Guid.Empty))
			{
				guid2 = val.RootHierarchyKey;
			}
			NavigationHierarchy val2 = NavigationHierarchyController.NavigationHierarchy(guid2, AppContext.CurrentContext.StatefulBusinessContainer);
			if (val2.Navigation.ContentAreaFolder != null)
			{
				templateContent = GetTemplateContent(val2.Navigation.ContentAreaFolder, Guid.Empty);
				navigationContentAttributes = val2.Navigation.NavigationContentAttributes;
			}
		}
		else if (!AppContext.CurrentContext.NavigationKey.Equals(Guid.Empty))
		{
			Navigation fromNavigationKey = Navigation.GetFromNavigationKey(AppContext.CurrentContext.NavigationKey, AppContext.CurrentContext.StatefulBusinessContainer);
			if (fromNavigationKey != null && fromNavigationKey.ContentAreaFolder != null)
			{
				templateContent = GetTemplateContent(fromNavigationKey.ContentAreaFolder, Guid.Empty);
				navigationContentAttributes = fromNavigationKey.NavigationContentAttributes;
			}
			else if (fromNavigationKey != null)
			{
				Navigation parentContentAreaFolder = GetParentContentAreaFolder(fromNavigationKey);
				if (parentContentAreaFolder != null)
				{
					templateContent = GetTemplateContent(parentContentAreaFolder.ContentAreaFolder, Guid.Empty);
					navigationContentAttributes = fromNavigationKey.NavigationContentAttributes;
				}
			}
		}
		if (templateContent == null && val.ContentAreaFolder != null)
		{
			templateContent = GetTemplateContent(val.ContentAreaFolder, Guid.Empty);
		}
		if (templateContent == null && DocumentVersionKey != Guid.Empty)
		{
			templateContent = GetTemplateContent(null, DocumentVersionKey);
		}
		if (templateContent != null)
		{
			ApplyTemplateContent(templateContent, navigationContentAttributes);
			buttonPanel.CssClass = "ContentRecordPageButtonPanel";
			Controls.Add(buttonPanel);
			string translatedPhrase = ((DisplayPageBase)Page).GetTranslatedPhrase(ResourceManager.GetWord("Content Designer"));
			string arg = string.Format(CultureInfo.InvariantCulture, "contentRecordChangeRequest(\"{0}\",null,\"{1}\")", templateContent.ContentKey.ToString(), translatedPhrase);
			string arg2 = string.Format(CultureInfo.InvariantCulture, "{0}/AsiCommon/Images/icon_con.gif", Utilities.GetTildeExpansion());
			string phrase = ResourceManager.GetPhrase("ContentRecordPage.ChangeRequestButtonToolTip", "Request a change for this content");
			requestChangeButton.Text = string.Format(CultureInfo.InvariantCulture, "<img name='requestlink' onclick='{0}' src='{1}' alt='{2}' />", arg, arg2, phrase);
			requestChangeButton.Visible = false;
			buttonPanel.Controls.Add(requestChangeButton);
		}
	}

	private static Navigation GetParentContentAreaFolder(Navigation navigation)
	{
		NavigationHierarchyController val = NavigationHierarchyController.NewNavigationHierarchyController(AppContext.CurrentContext.StatefulBusinessContainer);
		((DataTable)(object)val).DefaultView.Sort = "RootHierarchyKey, SortOrder, Depth";
		NavigationHierarchy[] array = val.NavigationHierarchyTree(AppContext.CurrentContext.RootHierarchyKey, true);
		int num = HierarchyController.FindIndex((Hierarchy[])(object)array, ((AtomBaseHierarchy)navigation).HierarchyKey);
		int num2 = num;
		if (num2 != -1 && num2 != 0)
		{
			if (num == 1 || ((Hierarchy)array[num]).ParentHierarchyKey == ((Hierarchy)array[0]).HierarchyKey)
			{
				Navigation fromHierarchy = Navigation.GetFromHierarchy((Hierarchy)(object)array[0], true);
				if (fromHierarchy != null && fromHierarchy.ContentAreaFolder != null)
				{
					return fromHierarchy;
				}
			}
			else
			{
				Hierarchy val2 = HierarchyController.Hierarchy(((Hierarchy)array[num]).ParentHierarchyKey, AppContext.CurrentContext.StatefulBusinessContainer);
				Navigation fromHierarchy = Navigation.GetFromHierarchy(val2, true);
				if (fromHierarchy != null && fromHierarchy.ContentAreaFolder != null)
				{
					return fromHierarchy;
				}
				Hierarchy[] ancestorList = NavigationHierarchyController.GetAncestorList(array, num);
				if (ancestorList != null && ancestorList.Length > 1)
				{
					Hierarchy[] array2 = ancestorList;
					foreach (Hierarchy val3 in array2)
					{
						fromHierarchy = Navigation.GetFromHierarchy(val3, true);
						if (fromHierarchy != null && fromHierarchy.ContentAreaFolder != null)
						{
							return fromHierarchy;
						}
					}
				}
			}
		}
		return null;
	}

	protected override void OnPreRender(EventArgs e)
	{
		DisplayPageBase displayPageBase = Page as DisplayPageBase;
		if (buttonPanel != null && displayPageBase != null)
		{
			if (displayPageBase.SurfToEditEnabled)
			{
				if (AppContext.CurrentPrincipal.IsInRole("SysAdmin"))
				{
					requestChangeButton.Visible = false;
				}
				else
				{
					DataSet privileges = ContentManagerAuthorityGroup.GetPrivileges(AppContext.CurrentIdentity.UserKey);
					if (privileges != null && privileges.Tables.Count > 0 && privileges.Tables[0].Rows.Count > 0 && templateContent != null && ((AtomBaseSerializationNeutral)templateContent).HasPermission((AclPermissionType)8))
					{
						if (ContentManagerAuthorityGroup.HasCMPrivilege(privileges, "Content Editor"))
						{
							foreach (IDisplayContentItem displayControl in displayControls)
							{
								displayControl.ShowSurfToEdit = true;
							}
						}
						else
						{
							requestChangeButton.Visible = true;
						}
					}
				}
			}
			else
			{
				requestChangeButton.Visible = false;
			}
		}
		base.OnPreRender(e);
	}

	private Content GetTemplateContent(ContentFolder contentFolder, Guid documentVersionKey)
	{
		//IL_0096: Unknown result type (might be due to invalid IL or missing references)
		//IL_009c: Expected O, but got Unknown
		//IL_00dc: Unknown result type (might be due to invalid IL or missing references)
		//IL_00e2: Expected O, but got Unknown
		if (contentFolder != null && documentVersionKey == Guid.Empty)
		{
			string text = string.Format(CultureInfo.InvariantCulture, "{0}:{1}", contentFolder.ContentFolderKey.ToString(), AppContext.CurrentIdentity.UserKey);
			Document[] array = (Document[])CacheManager.Instance.GetData("TemplateContent", text, (CachePolicyOptions)0);
			if (array == null)
			{
				array = DocumentController.DocumentsInFolder(((AtomBaseHierarchy)contentFolder).Path, true, AppContext.CurrentContext.StatefulBusinessContainer, (BusinessFilter[])(object)new BusinessFilter[1]
				{
					new BusinessFilter("DocumentTypeCode", (ComparisonType)3, (object)"CON")
				});
				if (ArrayExtensionMethods.IsNullOrEmpty((IList)array))
				{
					array = DocumentController.DocumentsInFolder(((AtomBaseHierarchy)contentFolder).Path, AppPrincipal.CurrentIdentity.OrganizationKey, true, AppContext.CurrentContext.StatefulBusinessContainer, (BusinessFilter[])(object)new BusinessFilter[1]
					{
						new BusinessFilter("DocumentTypeCode", (ComparisonType)3, (object)"CON")
					});
				}
				CacheManager.Instance.Add("TemplateContent", text, (object)array, (CachePolicyOptions)0);
			}
			if (!ArrayExtensionMethods.IsNullOrEmpty((IList)array))
			{
				Document[] array2 = array;
				foreach (Document val in array2)
				{
					Content fromDocument = Content.GetFromDocument(val);
					if (TemplateAreaName.Equals(fromDocument.ContentArea, StringComparison.CurrentCultureIgnoreCase))
					{
						return fromDocument;
					}
				}
			}
		}
		if (contentFolder == null && documentVersionKey != Guid.Empty)
		{
			Content fromContentKey = Content.GetFromContentKey(documentVersionKey);
			if (documentVersionKey == fromContentKey.ContentKey)
			{
				return fromContentKey;
			}
		}
		return null;
	}

	private void ApplyTemplateContent(Content content, string navContentAttributes)
	{
		//IL_001a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0020: Expected O, but got Unknown
		//IL_0066: Unknown result type (might be due to invalid IL or missing references)
		//IL_006d: Expected O, but got Unknown
		if (HonorContentRecordLayout)
		{
			ApplyTemplateContentWithLayout(content, navContentAttributes);
			return;
		}
		XmlDocument xmlDocument = (XmlDocument)new AsiXmlDocument();
		if (!string.IsNullOrEmpty(navContentAttributes))
		{
			xmlDocument.LoadXml(navContentAttributes);
		}
		foreach (ContentItem item in (ModifiedCollection<ContentItem>)(object)content.Items)
		{
			if (item.ContentRenderer.SupportsRuntime)
			{
				ContentParameterCollection val = new ContentParameterCollection();
				val.ContentItemKey = item.ContentItemKey;
				if (xmlDocument.SelectSingleNode("/NavigationAttributes/ContentItem[@key=\"" + item.ContentItemKey.ToString() + "\"]") is XmlElement xml)
				{
					val.Xml = xml;
				}
				Control control = item.ContentRenderer.RenderForRuntime(item, val);
				IDisplayContentItem val2 = (IDisplayContentItem)(object)((control is IDisplayContentItem) ? control : null);
				if (val2 != null)
				{
					displayControls.Add(val2);
				}
				Controls.Add(control);
			}
		}
	}

	private void ApplyTemplateContentWithLayout(Content content, string navContentAttributes)
	{
		//IL_0001: Unknown result type (might be due to invalid IL or missing references)
		//IL_0007: Expected O, but got Unknown
		//IL_0026: Unknown result type (might be due to invalid IL or missing references)
		//IL_0030: Expected O, but got Unknown
		//IL_048b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0492: Expected O, but got Unknown
		//IL_01ea: Unknown result type (might be due to invalid IL or missing references)
		//IL_01f1: Expected O, but got Unknown
		//IL_03ac: Unknown result type (might be due to invalid IL or missing references)
		//IL_03b3: Expected O, but got Unknown
		XmlDocument xmlDocument = (XmlDocument)new AsiXmlDocument();
		if (!string.IsNullOrEmpty(navContentAttributes))
		{
			xmlDocument.LoadXml(navContentAttributes);
		}
		ContentLayout val = content.ContentLayout ?? ContentLayout.GetDefaultLayout(new BusinessContainer());
		if (val != null && !string.IsNullOrEmpty(val.LayoutMarkup) && ((CollectionBase)(object)val.Zones).Count > 0)
		{
			string layoutMarkup = val.LayoutMarkup;
			int num = 0;
			int num2 = 0;
			while (num <= layoutMarkup.Length + 1)
			{
				num = layoutMarkup.IndexOf('{', num);
				if (num < 0)
				{
					Literal literal = new Literal();
					literal.Text = layoutMarkup.Substring(num2, layoutMarkup.Length - num2);
					Controls.Add(literal);
					break;
				}
				int num3 = layoutMarkup.IndexOf('}', num);
				if (num3 < 0)
				{
					Literal literal = new Literal();
					literal.Text = layoutMarkup.Substring(num2, layoutMarkup.Length - num2);
					Controls.Add(literal);
					break;
				}
				if (num3 != num + 1)
				{
					if (!int.TryParse(layoutMarkup.Substring(num + 1, num3 - num - 1), out var result))
					{
						num = num3 + 1;
						continue;
					}
					Literal literal = new Literal();
					literal.Text = layoutMarkup.Substring(num2, num - num2);
					Controls.Add(literal);
					Panel panel = new Panel();
					panel.ID = string.Format(CultureInfo.InvariantCulture, "Zone{0}PlaceHolder", result);
					Controls.Add(panel);
					num = (num2 = num3 + 1);
				}
			}
			{
				foreach (ContentLayoutZone item in (CollectionBase)(object)val.Zones)
				{
					ContentLayoutZone val2 = item;
					Panel panel2 = (Panel)FindControl(string.Format(CultureInfo.InvariantCulture, "Zone{0}PlaceHolder", val2.ZoneNumber));
					if (panel2 == null)
					{
						continue;
					}
					string text = (content.LayoutZoneProperties.ContainsKey(val2.ZoneNumber + "_Title") ? content.LayoutZoneProperties[val2.ZoneNumber + "_Title"] : string.Empty);
					string text2 = (content.LayoutZoneProperties.ContainsKey(val2.ZoneNumber + "_CssClass") ? content.LayoutZoneProperties[val2.ZoneNumber + "_CssClass"] : string.Empty);
					string text3 = (content.LayoutZoneProperties.ContainsKey(val2.ZoneNumber + "_TitleCssClass") ? content.LayoutZoneProperties[val2.ZoneNumber + "_TitleCssClass"] : string.Empty);
					if (!string.IsNullOrEmpty(text2))
					{
						panel2.CssClass = text2;
					}
					if (!string.IsNullOrEmpty(text))
					{
						Panel panel3 = new Panel();
						if (!string.IsNullOrEmpty(text3))
						{
							panel3.CssClass = text3;
						}
						panel3.Controls.Add(new Label
						{
							Text = text
						});
						panel2.Controls.Add(panel3);
					}
					foreach (ContentItem item2 in (ModifiedCollection<ContentItem>)(object)content.GetItemsInZone(val2.ZoneNumber))
					{
						ContentParameterCollection val3 = new ContentParameterCollection();
						val3.ContentItemKey = item2.ContentItemKey;
						if (xmlDocument.SelectSingleNode("/NavigationAttributes/ContentItem[@key=\"" + item2.ContentItemKey.ToString() + "\"]") is XmlElement xml)
						{
							val3.Xml = xml;
						}
						panel2.Controls.Add(item2.ContentRenderer.RenderForRuntime(item2, val3));
					}
				}
				return;
			}
		}
		foreach (ContentItem item3 in (ModifiedCollection<ContentItem>)(object)content.Items)
		{
			ContentParameterCollection val4 = new ContentParameterCollection();
			val4.ContentItemKey = item3.ContentItemKey;
			if (xmlDocument.SelectSingleNode("/NavigationAttributes/ContentItem[@key=\"" + item3.ContentItemKey.ToString() + "\"]") is XmlElement xml2)
			{
				val4.Xml = xml2;
			}
			Controls.Add(item3.ContentRenderer.RenderForRuntime(item3, val4));
		}
	}
}
