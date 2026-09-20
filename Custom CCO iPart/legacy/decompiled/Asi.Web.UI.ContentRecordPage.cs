using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Threading;
using System.Web;
using System.Web.Management;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Xml;
using Asi.Application;
using Asi.Atom;
using Asi.Business;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Business.ContentManagement.ContentType;
using Asi.Core.Performance;
using Asi.Security;
using Asi.Soa.Core.Attributes;
using Asi.Web.HealthMonitoring;
using Asi.Xml;
using log4net;

namespace Asi.Web.UI;

[ComVisible(false)]
[ExcludeFromCodeCoverage]
public class ContentRecordPage : DisplayPageBase
{
	private static readonly ILog log = LogManager.GetLogger(typeof(ContentRecordPage));

	private Panel buttonPanel;

	private bool isCachedPage;

	private readonly HyperLink requestChangeButton = new HyperLink();

	private readonly HyperLink surfToEditAnchor = new HyperLink();

	protected Dictionary<Guid, Control> ContentItemKeyMap = new Dictionary<Guid, Control>();

	private static readonly string contentDocumentCacheString = Guid.NewGuid().ToString();

	public override TemplateType TemplateType
	{
		get
		{
			if (ViewState["TemplateType"] == null)
			{
				Content fromContentKey = Content.GetFromContentKey(ContentRecordKey, base.Container, false, true);
				if (fromContentKey != null && !fromContentKey.ShowInTemplateFlag)
				{
					ViewState["TemplateType"] = TemplateType.E;
				}
				else if (base.Request["TemplateType"] != null)
				{
					ViewState["TemplateType"] = Enum.Parse(typeof(TemplateType), base.Request["TemplateType"]);
				}
				if (ViewState["TemplateType"] == null)
				{
					ViewState["TemplateType"] = (DisplayPageBase.TextOnlyMode ? TemplateType.T : TemplateType.A);
				}
			}
			return (TemplateType)ViewState["TemplateType"];
		}
	}

	public string PageWrapperCssClass
	{
		get
		{
			Content fromContentKey = Content.GetFromContentKey(ContentRecordKey, base.Container, false, true);
			if (fromContentKey != null && !string.IsNullOrEmpty(fromContentKey.PageWrapperCssClass))
			{
				return fromContentKey.PageWrapperCssClass;
			}
			return string.Empty;
		}
	}

	[ExcludeFromCodeCoverage]
	public virtual Guid ContentRecordKey
	{
		get
		{
			if (ViewState["ContentRecordKey"] != null)
			{
				return (Guid)ViewState["ContentRecordKey"];
			}
			return Guid.Empty;
		}
		set
		{
			ViewState["ContentRecordKey"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public virtual Guid ContentHierarchyKey
	{
		get
		{
			if (ViewState["ContentHierarchyKey"] != null)
			{
				return (Guid)ViewState["ContentHierarchyKey"];
			}
			return Guid.Empty;
		}
		set
		{
			ViewState["ContentHierarchyKey"] = value;
		}
	}

	public override bool IsCachedPage => isCachedPage;

	[ExcludeFromCodeCoverage]
	protected override void CreateChildControls()
	{
		//IL_0168: Unknown result type (might be due to invalid IL or missing references)
		base.CreateChildControls();
		if (ContentRecordKey == Guid.Empty)
		{
			return;
		}
		buttonPanel = new Panel
		{
			CssClass = "ContentRecordPageButtonPanel"
		};
		if (base.Master != null)
		{
			if (base.Master.FindControl("ContentRecordShortcut") is ContentPlaceHolder contentPlaceHolder)
			{
				contentPlaceHolder.Controls.Add(buttonPanel);
			}
			else if (base.Master.FindControl("TemplateBody") is ContentPlaceHolder contentPlaceHolder2)
			{
				contentPlaceHolder2.Controls.Add(buttonPanel);
			}
		}
		if (!ContentRecordKey.Equals(Guid.Empty))
		{
			Content fromContentKey = Content.GetFromContentKey(ContentRecordKey, (BusinessContainer)null, false);
			if (fromContentKey != null)
			{
				string translatedPhrase = ((DisplayPageBase)Page).GetTranslatedPhrase(ResourceManager.GetPhrase("ContentDesigner", "Content Designer"));
				string value = string.Format(CultureInfo.InvariantCulture, "surfToEditContentRecord(\"{0}\",null,\"{1}\")", ContentHierarchyKey, translatedPhrase);
				string imageUrl = string.Format(CultureInfo.InvariantCulture, "{0}/AsiCommon/Images/icon_con.gif", Utilities.GetTildeExpansion());
				string text = string.Format(ResourceManager.GetPhrase("ContentRecordPage.SurfToEditButtonToolTip", "Edit this content: {0}\nStatus: {1}\nUpdated on: {2} {3}"), ((AtomBaseSerializationNeutral)fromContentKey).Name, ((AtomBaseSerializationNeutral)fromContentKey).Status, fromContentKey.StatusUpdatedOn.ToShortDateString(), fromContentKey.StatusUpdatedOn.ToLongTimeString());
				surfToEditAnchor.CssClass = "ContentRecordPageAnchor";
				surfToEditAnchor.Attributes.Add("OnClick", value);
				surfToEditAnchor.ImageUrl = imageUrl;
				surfToEditAnchor.Text = text;
				surfToEditAnchor.ToolTip = text;
				surfToEditAnchor.Attributes.Add("translate", "yes");
				buttonPanel.Controls.Add(surfToEditAnchor);
				value = string.Format(CultureInfo.InvariantCulture, "contentRecordChangeRequest(\"{0}\",null,\"{1}\")", ContentRecordKey, translatedPhrase);
				imageUrl = string.Format(CultureInfo.InvariantCulture, "{0}/AsiCommon/Images/icon_con.gif", Utilities.GetTildeExpansion());
				text = ResourceManager.GetPhrase("ContentRecordPage.ChangeRequestButtonToolTip", "Request a change for this content");
				requestChangeButton.CssClass = "ContentRecordPageAnchor";
				requestChangeButton.Attributes.Add("OnClick", value);
				requestChangeButton.ImageUrl = imageUrl;
				requestChangeButton.Text = text;
				requestChangeButton.ToolTip = text;
				buttonPanel.Controls.Add(requestChangeButton);
			}
		}
	}

	[ExcludeFromCodeCoverage]
	protected override void OnInit(EventArgs e)
	{
		//IL_033e: Unknown result type (might be due to invalid IL or missing references)
		//IL_0345: Expected O, but got Unknown
		//IL_01b5: Unknown result type (might be due to invalid IL or missing references)
		//IL_01bc: Expected O, but got Unknown
		//IL_03c4: Unknown result type (might be due to invalid IL or missing references)
		//IL_03c9: Unknown result type (might be due to invalid IL or missing references)
		//IL_03d2: Unknown result type (might be due to invalid IL or missing references)
		//IL_03dd: Expected O, but got Unknown
		bool flag = false;
		base.OnInit(e);
		if (Page.IsPostBack)
		{
			base.Response.Cache.AddValidationCallback(InvalidateForPostBack, null);
		}
		Document cachedDocument;
		Content fromDocument;
		if (!ContentRecordKey.Equals(Guid.Empty))
		{
			cachedDocument = GetCachedDocument(ContentRecordKey, base.Container);
			if (cachedDocument != null)
			{
				fromDocument = Content.GetFromDocument(cachedDocument);
				flag |= fromDocument.IsHTTPS;
				if (SystemConfig.GetBool("Content.EnablePageCaching", true))
				{
					EnableOutputCaching(fromDocument);
				}
				IPrincipal user = base.User;
				Guid administratorsRoleKey = CommonToken.AdministratorsRoleKey;
				if (!user.IsInRole(administratorsRoleKey.ToString()))
				{
					if (!((SecureItem)cachedDocument).AccessSet.SoftQuery((AclPermissionType)2))
					{
						goto IL_011b;
					}
					if (fromDocument.IsMemberOnly)
					{
						IPrincipal user2 = base.User;
						administratorsRoleKey = CommonToken.MembersGroupKey;
						if (!user2.IsInRole(administratorsRoleKey.ToString()))
						{
							goto IL_011b;
						}
					}
				}
				goto IL_01f2;
			}
		}
		goto IL_02a0;
		IL_01f2:
		if (base.Website != null)
		{
			string redirectTarget = GetRedirectTarget(fromDocument, base.Website.WebsiteKey, SessionState.IsLoggedIn);
			if (!string.IsNullOrEmpty(redirectTarget))
			{
				base.Response.Redirect(redirectTarget);
			}
		}
		HtmlGenericControl htmlGenericControl = (HtmlGenericControl)base.Master.FindControl("MainBody");
		if (htmlGenericControl != null && !string.IsNullOrEmpty(PageWrapperCssClass))
		{
			System.Web.UI.AttributeCollection attributes = htmlGenericControl.Attributes;
			attributes["class"] = attributes["class"] + " " + PageWrapperCssClass;
		}
		goto IL_02a0;
		IL_011b:
		if (AppPrincipal.CurrentPrincipal == null || !AppPrincipal.CurrentIdentity.IsAuthenticated || AppPrincipal.CurrentIdentity.UserId == "GUEST")
		{
			DisplayPageBase.RedirectToLogin(this, isSecure: false, base.Request.RawUrl);
		}
		else
		{
			string phrase = ResourceManager.GetPhrase("UserCannotAccessContentError", "User {0} attempted to access content {1} ({2}) but did not have permission to view it.", new object[3]
			{
				Context.User.Identity.Name,
				cachedDocument.AlternateName,
				cachedDocument.DocumentVersionKey
			});
			AsiWebFailureAuditEvent val = new AsiWebFailureAuditEvent(phrase, (object)this, (AsiAuditEventCode)160013);
			((WebBaseEvent)(object)val).Raise();
			base.Response.Redirect(Utilities.GetTildeExpansion() + "/Error.aspx?iErrorType=Asi.Security.AccessDenied&ErrorReferrer=" + HttpUtility.UrlEncode(base.Request.RawUrl));
		}
		goto IL_01f2;
		IL_02a0:
		if (!DisplayPageBase.GetHierarchyKey(DisplayPageBase.CurrentContext).Equals(Guid.Empty))
		{
			ImpersonationInformation val2 = SecurityContext.Impersonate("MANAGER");
			try
			{
				NavigationHierarchy val3 = NavigationHierarchyController.NavigationHierarchy(AppContext.CurrentContext.HKey, SiteMapProviderBase.SiteMapProvider.BusinessContainer);
				if (val3 != null)
				{
					if (((AtomBaseSerializationNeutral)val3.Navigation).Document.RelatedDocumentVersionKey.Equals(ContentRecordKey) && !string.IsNullOrEmpty(val3.Navigation.NavigationContentAttributes))
					{
						XmlDocument xmlDocument = (XmlDocument)new AsiXmlDocument();
						xmlDocument.LoadXml(val3.Navigation.NavigationContentAttributes);
						XmlNodeList xmlNodeList = xmlDocument.SelectNodes("/NavigationAttributes/ContentItem");
						if (xmlNodeList != null && xmlNodeList.Count != 0)
						{
							EnsureChildUserControls();
							foreach (XmlElement item in xmlNodeList)
							{
								Guid guid = new Guid(item.Attributes["key"].Value);
								ContentParameterCollection val4 = new ContentParameterCollection
								{
									ContentItemKey = guid,
									Xml = item
								};
								if (!ContentItemKeyMap.ContainsKey(guid))
								{
									continue;
								}
								Control control = ContentItemKeyMap[guid];
								if (control == null)
								{
									continue;
								}
								IDisplayContentItem val5 = (IDisplayContentItem)(object)((control is IDisplayContentItem) ? control : null);
								if (val5 != null)
								{
									val5.ContentParameters = val4;
									val5.ContentItem.SetParameterValues(val4);
								}
								foreach (KeyValuePair<string, string> item2 in (Dictionary<string, string>)(object)val4)
								{
									PropertyInfo property = control.GetType().GetProperty(item2.Key);
									if (!(property == null))
									{
										TypeConverter converter = TypeDescriptor.GetConverter(property.PropertyType);
										property.SetValue(control, converter.ConvertFromString(item2.Value), null);
									}
								}
							}
						}
					}
					if (((Hierarchy)val3).HierarchyKey.Equals(val3.Website.HomePageHierarchyKey))
					{
						base.IsHomePage = true;
					}
					flag |= val3.IsHTTPS;
				}
			}
			finally
			{
				((IDisposable)val2)?.Dispose();
			}
		}
		Utilities.RedirectToCorrectHttpScheme(flag, base.Website, base.Request, base.Response);
	}

	public static string GetRedirectTarget(Content content, Guid websiteKey, bool loggedIn)
	{
		//IL_004a: Unknown result type (might be due to invalid IL or missing references)
		//IL_004f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0051: Unknown result type (might be due to invalid IL or missing references)
		//IL_0068: Expected I4, but got Unknown
		//IL_0163: Unknown result type (might be due to invalid IL or missing references)
		//IL_016a: Expected O, but got Unknown
		string text = null;
		if (((content != null) ? content.RedirectInstructions : null) != null && content.RedirectInstructions.Count > 0)
		{
			using Dictionary<RedirectReason, string>.Enumerator enumerator = content.RedirectInstructions.GetEnumerator();
			if (enumerator.MoveNext())
			{
				KeyValuePair<RedirectReason, string> current = enumerator.Current;
				bool flag = false;
				RedirectReason key = current.Key;
				switch ((int)key)
				{
				case 1:
					flag = true;
					break;
				case 2:
					if (loggedIn)
					{
						flag = true;
					}
					break;
				case 3:
					if (!loggedIn)
					{
						flag = true;
					}
					break;
				}
				if (flag)
				{
					bool flag2 = false;
					text = current.Value;
					if (current.Value.StartsWith("~"))
					{
						UrlInfo val = URLMapping.FindURLByDirectoryName(current.Value.Substring(1), websiteKey);
						if (val != null)
						{
							text = val.Url;
							flag2 = true;
						}
					}
					else if (current.Value.StartsWith("@"))
					{
						Guid guid = DocumentSystem.DocumentKeyByPath(Guid.Empty, current.Value);
						if (guid == Guid.Empty)
						{
							guid = DocumentSystem.DocumentKeyByPath(current.Value);
						}
						if (guid != Guid.Empty)
						{
							Document val2 = DocumentController.Document(guid);
							if (val2 != null)
							{
								Content val3 = new Content(val2);
								text = ((AtomBaseSerializationNeutral)val3).GetNavigateUrl();
								flag2 = true;
							}
						}
					}
					if (flag2 && !string.IsNullOrEmpty(text) && !text.ToUpperInvariant().Contains("WEBSITEKEY="))
					{
						text = string.Format("{0}{1}WebsiteKey={2}", text, text.Contains("?") ? "&" : "?", websiteKey);
					}
				}
			}
		}
		return text;
	}

	private void EnableOutputCaching(Content content)
	{
		if (base.IsPostBack || HttpContext.Current == null || HttpContext.Current.User == null || string.IsNullOrEmpty(HttpContext.Current.User.Identity.Name) || IsTextOnlyMode())
		{
			return;
		}
		string text = HttpContext.Current.User.Identity.Name.ToUpper(CultureInfo.InvariantCulture);
		Guid systemEntityKey = SystemEntityController.SystemEntityByName("Content", base.Container).SystemEntityKey;
		if (text == "GUEST")
		{
			string firstConfigValue = AppConfig.GetFirstConfigValue("CM.CacheDurationDefault", systemEntityKey);
			string text2 = content.CacheDuration;
			if (string.IsNullOrWhiteSpace(text2))
			{
				text2 = firstConfigValue;
			}
			if (string.IsNullOrWhiteSpace(text2))
			{
				text2 = "Default";
			}
			int num = 0;
			switch (text2)
			{
			case "Default":
				num = 0;
				break;
			case "Medium":
				num = 300;
				break;
			case "Short":
				num = 300;
				break;
			case "Long":
				num = 3600;
				break;
			}
			if (num > 0)
			{
				isCachedPage = true;
				OutputCacheParameters cacheSettings = new OutputCacheParameters
				{
					Duration = num,
					VaryByCustom = "browser;pageURL",
					VaryByHeader = "Accept-Language",
					VaryByParam = "*",
					Location = OutputCacheLocation.Server
				};
				InitOutputCache(cacheSettings);
				base.Response.Cache.AddValidationCallback(ValidateCacheOutput, content);
			}
		}
	}

	public static void InvalidateForPostBack(HttpContext context, object data, ref HttpValidationStatus status)
	{
		status = HttpValidationStatus.IgnoreThisRequest;
	}

	public static void ValidateCacheOutput(HttpContext context, object data, ref HttpValidationStatus status)
	{
		if (data == null)
		{
			return;
		}
		if (!context.Request.HttpMethod.Equals("GET"))
		{
			status = HttpValidationStatus.IgnoreThisRequest;
		}
		else if (IsTextOnlyMode())
		{
			status = HttpValidationStatus.IgnoreThisRequest;
		}
		else if (HttpContext.Current.User != null && !string.IsNullOrEmpty(HttpContext.Current.User.Identity.Name))
		{
			string text = HttpContext.Current.User.Identity.Name.ToUpper(CultureInfo.InvariantCulture);
			if (text != "GUEST")
			{
				status = HttpValidationStatus.IgnoreThisRequest;
			}
		}
	}

	private static bool IsTextOnlyMode()
	{
		return DisplayPageBase.TextOnlyMode;
	}

	[ExcludeFromCodeCoverage]
	protected override void OnLoad(EventArgs e)
	{
		base.OnLoad(e);
		if (!Page.IsPostBack)
		{
			DataBind();
		}
	}

	[ExcludeFromCodeCoverage]
	protected override void OnPreRender(EventArgs e)
	{
		if (buttonPanel != null)
		{
			if (AppContext.CurrentPrincipal.IsInRole("SysAdmin"))
			{
				base.ShowSurfToEditButton = true;
				surfToEditAnchor.Visible = base.SurfToEditEnabled;
				requestChangeButton.Visible = false;
			}
			else
			{
				DataSet privileges = ContentManagerAuthorityGroup.GetPrivileges(AppContext.CurrentIdentity.UserKey);
				if (privileges == null || privileges.Tables.Count <= 0 || privileges.Tables[0].Rows.Count <= 0)
				{
					HyperLink hyperLink = surfToEditAnchor;
					bool visible = (requestChangeButton.Visible = false);
					hyperLink.Visible = visible;
				}
				else
				{
					base.ShowSurfToEditButton = true;
					if (ContentManagerAuthorityGroup.HasCMPrivilege(privileges, "Content Editor") && ((AtomBaseSerializationNeutral)Content.GetFromContentKey(ContentRecordKey, base.Container)).HasPermission((AclPermissionType)8))
					{
						surfToEditAnchor.Visible = base.SurfToEditEnabled;
						requestChangeButton.Visible = false;
					}
					else
					{
						surfToEditAnchor.Visible = false;
						requestChangeButton.Visible = base.SurfToEditEnabled;
					}
				}
			}
		}
		base.OnPreRender(e);
	}

	public static Document GetCachedDocument(Guid documentKey, BusinessContainer container)
	{
		return GetCachedDocument(documentKey, container, 3);
	}

	public static Document GetCachedDocument(Guid documentKey, BusinessContainer container, int tries)
	{
		//IL_001e: Unknown result type (might be due to invalid IL or missing references)
		//IL_0024: Expected O, but got Unknown
		//IL_0162: Unknown result type (might be due to invalid IL or missing references)
		//IL_0169: Invalid comparison between Unknown and I4
		//IL_01b4: Unknown result type (might be due to invalid IL or missing references)
		//IL_01bb: Invalid comparison between Unknown and I4
		//IL_016c: Unknown result type (might be due to invalid IL or missing references)
		//IL_0173: Invalid comparison between Unknown and I4
		//IL_0199: Unknown result type (might be due to invalid IL or missing references)
		Document val = (Document)CacheManager.Instance.GetData(contentDocumentCacheString, documentKey.ToString(), (CachePolicyOptions)0);
		if (val != null && ((DataRow)(object)val).RowState.Equals(DataRowState.Unchanged))
		{
			DocumentController val2 = DocumentController.NewDocumentController(container);
			Guid documentKey2 = val.DocumentKey;
			if (!((BusinessController)val2).ContainsItem(new object[1] { documentKey2 }))
			{
				((DataTable)(object)val2).ImportRow((DataRow)(object)val);
				UniformRegistryController val3 = UniformRegistryController.NewUniformRegistryController(container);
				if (((BusinessController)val3).ContainsItem(new object[1] { documentKey2 }))
				{
					UniformRegistry val4 = UniformRegistryController.UniformRegistry(documentKey2, container);
					if (((DataRow)(object)val4).RowState.Equals(DataRowState.Added))
					{
						((DataRow)(object)val4).AcceptChanges();
					}
				}
			}
			return val2[documentKey2];
		}
		ImpersonationInformation val5 = SecurityContext.Impersonate("MANAGER");
		try
		{
			int num = 0;
			bool flag = false;
			while (!flag && num < tries)
			{
				try
				{
					val = DocumentController.Document(documentKey, container);
					flag = true;
				}
				catch (Exception ex)
				{
					log.Error((object)ex);
					Thread.Sleep(4000);
				}
				num++;
			}
			if (!flag)
			{
				val = DocumentController.Document(documentKey, container, false);
				if (val != null && (int)val.DocumentStatusCode != 30 && (int)val.DocumentStatusCode != 40)
				{
					throw new BusinessItemLoadException(string.Format("{0} (DocumentVersionKey={1})", "Unable to load requested business object ", documentKey));
				}
			}
		}
		finally
		{
			((IDisposable)val5)?.Dispose();
		}
		if (val != null && (int)val.DocumentStatusCode != 30)
		{
			CacheManager.Instance.Add(contentDocumentCacheString, documentKey.ToString(), (object)val, (CachePolicyOptions)2);
		}
		return val;
	}
}
