using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Configuration;
using System.Data;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Web;
using System.Web.Profile;
using System.Web.Script.Services;
using System.Web.Security;
using System.Web.Services;
using System.Web.UI;
using System.Web.UI.WebControls;
using Asi.Application;
using Asi.Atom;
using Asi.Business;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Core.Common;
using Asi.Security;
using Asi.Security.Utility;
using Asi.Soa.ClientServices;
using Asi.Utilities;
using Asi.Web.UI.Common.BSA;
using Asi.Web.UI.WebControls;
using Asi.Web.UI.WebControls.Mvc;
using Newtonsoft.Json;
using Telerik.Web.UI;
using log4net;

namespace Asi.Web.UI;

[ComVisible(false)]
[ExcludeFromCodeCoverage]
public class DisplayPageBase : Page, IUserControl
{
	public const string TemplateTypeToken = "TemplateType";

	public const string PageOperationToken = "iOperation";

	public const string ObjectBrowserEmbeddedModeToken = "ObjectBrowserEmbeddedMode";

	public const string ClientScriptSetIsCtrl = "SetIsCtrl";

	public const string ClientScriptSetIsShift = "SetIsShift";

	public const string ClientScriptCancelEvent = "CancelEvent()";

	public const string ClientScriptDebugTrace = "_DebugTrace('{0}')";

	public const string ClientScriptDebugTraceDump = "_DebugTraceDump('{0}', '{1}')";

	public const string QueryStringDisplayMessagePrefix = "DisplayMessage_";

	private const int numberOfCachedContainers = 2;

	private BusinessContainer container;

	private BusinessContainer statefulContainer;

	private IAtom atom;

	private IAtom[] atomObject;

	private Collection<IUserControl> children;

	private readonly List<UserControlMessage> userMessages = new List<UserControlMessage>();

	private Website mImisWebsite;

	private object[] atomObjectPrimaryKey;

	private Guid pageInstanceKey;

	private LinkButton enableSurfToEditButton;

	private LinkButton disableSurfToEditButton;

	private MembershipUser mMembershipUser;

	private EntityManager entityManager;

	private MembershipManager membershipmanager;

	private static bool localizationLoadCollections = true;

	private static ILog log = AsiLogger.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);

	private readonly SortedList<string, string> clientScripts = new SortedList<string, string>();

	private static readonly SortedList<string, string> masterClientScripts = new SortedList<string, string>();

	private bool ensuringAtom;

	private bool ensuringAtomObject;

	private static string tildeExpansion;

	protected bool IsDesignTime => Context == null;

	[UrlProperty]
	public string CancelUrl
	{
		get
		{
			if (ViewState["CancelUrl"] != null)
			{
				return (string)ViewState["CancelUrl"];
			}
			string value = ((base.Request.QueryString["ReturnUrl"] != null) ? base.Request.QueryString["ReturnUrl"] : ((!(base.Request.UrlReferrer != null)) ? string.Empty : base.Request.UrlReferrer.AbsoluteUri));
			ViewState["CancelUrl"] = value;
			return (string)ViewState["CancelUrl"];
		}
		set
		{
			ViewState["CancelUrl"] = value;
		}
	}

	public bool IsPopup
	{
		get
		{
			if (ViewState["IsPopup"] != null)
			{
				return (bool)ViewState["IsPopup"];
			}
			ViewState["IsPopup"] = false;
			return (bool)ViewState["IsPopup"];
		}
		set
		{
			ViewState["IsPopup"] = value;
		}
	}

	public bool IsHomePage
	{
		get
		{
			if (ViewState["IsHomePage"] != null)
			{
				return (bool)ViewState["IsHomePage"];
			}
			return false;
		}
		set
		{
			ViewState["IsHomePage"] = value;
		}
	}

	public string Section
	{
		get
		{
			return (string)ViewState["Section"];
		}
		set
		{
			ViewState["Section"] = value;
			SessionState.Section = value;
		}
	}

	public static string WebsiteKey
	{
		get
		{
			HttpContext current = HttpContext.Current;
			if (current != null && current.Session != null)
			{
				if (current.Request["WebsiteKey"] != null)
				{
					current.Session["WebsiteKey"] = current.Request["WebsiteKey"];
				}
				if (current.Session["WebsiteKey"] != null)
				{
					return (string)current.Session["WebsiteKey"];
				}
			}
			return string.Empty;
		}
		set
		{
			if (HttpContext.Current != null)
			{
				HttpContext.Current.Session["WebsiteKey"] = value;
			}
		}
	}

	public Website Website
	{
		get
		{
			Website val = null;
			if (Guid.TryParse(WebsiteKey, out var result))
			{
				val = Website.GetFromWebsiteKey(result, Website.StaticBusinessContainer);
			}
			return val ?? Website.FindWebsiteByURL(base.Request.Url);
		}
	}

	protected virtual bool RequireAuthenticatedUser => false;

	public IAtom Atom
	{
		get
		{
			return atom;
		}
		set
		{
			atom = value;
		}
	}

	public IAtom[] AtomObject
	{
		get
		{
			return atomObject;
		}
		set
		{
			atomObject = value;
			atomObjectPrimaryKey = null;
		}
	}

	public object DataSource
	{
		get
		{
			return AtomObject;
		}
		set
		{
			AtomObject = ConvertObjectToIAtomArray(value, DataSourceBoundCallback);
		}
	}

	public IAtom Subject
	{
		get
		{
			if (AtomObject != null && AtomObject.Length != 0)
			{
				return AtomObject[0];
			}
			return null;
		}
		set
		{
			AtomObject = (IAtom[])(object)new IAtom[1] { value };
		}
	}

	public string SubjectName
	{
		get
		{
			//IL_0026: Unknown result type (might be due to invalid IL or missing references)
			//IL_002c: Expected O, but got Unknown
			IAtom subject = Subject;
			if (subject != null)
			{
				foreach (IAtomProperty item in (CollectionBase)(object)subject.Properties)
				{
					IAtomProperty val = item;
					if (val.IsDefaultProperty)
					{
						return BusinessWebControlUtilities.GetIAtomPropertyValue(subject, val.Name) as string;
					}
				}
			}
			return string.Empty;
		}
	}

	public string SubjectTitle
	{
		get
		{
			//IL_0026: Unknown result type (might be due to invalid IL or missing references)
			//IL_002c: Expected O, but got Unknown
			IAtom subject = Subject;
			if (subject != null)
			{
				foreach (IAtomProperty item in (CollectionBase)(object)subject.Properties)
				{
					IAtomProperty val = item;
					if (val.IsTitleProperty)
					{
						return BusinessWebControlUtilities.GetIAtomPropertyValue(subject, val.Name) as string;
					}
				}
			}
			return string.Empty;
		}
	}

	public string SubjectDescription
	{
		get
		{
			//IL_0026: Unknown result type (might be due to invalid IL or missing references)
			//IL_002c: Expected O, but got Unknown
			IAtom subject = Subject;
			if (subject != null)
			{
				foreach (IAtomProperty item in (CollectionBase)(object)subject.Properties)
				{
					IAtomProperty val = item;
					if (val.IsDescriptionProperty)
					{
						return BusinessWebControlUtilities.GetIAtomPropertyValue(subject, val.Name) as string;
					}
				}
			}
			return string.Empty;
		}
	}

	public virtual object[] AtomObjectPrimaryKey
	{
		get
		{
			//IL_00b0: Unknown result type (might be due to invalid IL or missing references)
			//IL_00b7: Expected O, but got Unknown
			if (atomObjectPrimaryKey == null)
			{
				string text = "AtomObjectPrimaryKey" + ClientID;
				if (atomObjectPrimaryKey == null && Page.Request.Form[text] != null)
				{
					atomObjectPrimaryKey = (object[])GetPropertyValue(text, Page.Request);
				}
				else if (AtomObject != null && AtomObject.Length != 0)
				{
					List<object> list = new List<object>();
					foreach (IAtomProperty item in (CollectionBase)(object)AtomObject[0].Properties)
					{
						IAtomProperty val = item;
						if (val.IsInPrimaryKey)
						{
							list.Add(BusinessWebControlUtilities.GetIAtomPropertyValue(AtomObject[0], val.Name));
						}
					}
					atomObjectPrimaryKey = list.ToArray();
				}
				else if (!string.IsNullOrEmpty(base.Request["UniformKey"]))
				{
					try
					{
						atomObjectPrimaryKey = new object[1]
						{
							new Guid(base.Request["UniformKey"])
						};
					}
					catch (FormatException)
					{
					}
				}
				else if (!string.IsNullOrEmpty(base.Request["iUniformKey"]))
				{
					try
					{
						atomObjectPrimaryKey = new object[1]
						{
							new Guid(base.Request["iUniformKey"])
						};
					}
					catch (FormatException)
					{
					}
				}
				else if (!string.IsNullOrEmpty(base.Request["PrimaryKey"]))
				{
					string[] array = base.Request["PrimaryKey"].Split(',');
					atomObjectPrimaryKey = array;
				}
			}
			return atomObjectPrimaryKey ?? new object[0];
		}
		set
		{
			atomObjectPrimaryKey = value;
		}
	}

	public virtual Guid SubjectUniformKey
	{
		get
		{
			object[] array = AtomObjectPrimaryKey;
			if (array != null && array.Length == 1 && array[0] is Guid)
			{
				return (Guid)array[0];
			}
			return Guid.Empty;
		}
		set
		{
			AtomObjectPrimaryKey = new object[1] { value };
		}
	}

	public Guid PageInstanceKey
	{
		get
		{
			if (pageInstanceKey.Equals(Guid.Empty))
			{
				if (Page.Request.Form["PageInstanceKey"] != null)
				{
					pageInstanceKey = new Guid(Page.Request.Form["PageInstanceKey"]);
				}
				else if (!string.IsNullOrEmpty(base.Request["PageInstanceKey"]))
				{
					pageInstanceKey = new Guid(base.Request["PageInstanceKey"]);
				}
				else if (PreserveStatefulBusinessContainer && !string.IsNullOrEmpty(base.Request["ParentPageInstanceKey"]))
				{
					pageInstanceKey = new Guid(base.Request["ParentPageInstanceKey"]);
				}
				else
				{
					pageInstanceKey = Guid.NewGuid();
				}
			}
			return pageInstanceKey;
		}
	}

	public static AppContext CurrentContext => AppContext.CurrentContext;

	public Collection<IUserControl> ChildUserControls
	{
		get
		{
			if (children == null)
			{
				EnsureChildUserControls();
			}
			return children;
		}
	}

	public List<UserControlMessage> UserControlMessages => userMessages;

	public BusinessContainer Container
	{
		get
		{
			if (container == null)
			{
				return StatefulBusinessContainer;
			}
			return container;
		}
		set
		{
			container = value;
			foreach (IUserControl childUserControl in ChildUserControls)
			{
				childUserControl.Container = value;
			}
		}
	}

	public BusinessContainer StatefulBusinessContainer
	{
		get
		{
			//IL_00d6: Unknown result type (might be due to invalid IL or missing references)
			//IL_00e0: Expected O, but got Unknown
			if (statefulContainer == null)
			{
				Dictionary<Guid, TimeStampedContainer> dictionary = new Dictionary<Guid, TimeStampedContainer>();
				try
				{
					if (Session["PageBusinessContainer"] != null)
					{
						dictionary = (Session["PageBusinessContainer"] as Dictionary<Guid, TimeStampedContainer>) ?? new Dictionary<Guid, TimeStampedContainer>();
					}
				}
				catch (ConstraintException ex)
				{
					log = AsiLogger.GetLogger(MethodBase.GetCurrentMethod().DeclaringType);
					log.Error((object)string.Format(CultureInfo.CurrentCulture, "Unable to load session page container, Page Instance key: {0}", PageInstanceKey), (Exception)ex);
				}
				if (dictionary.ContainsKey(PageInstanceKey))
				{
					statefulContainer = GetContainerFromList(dictionary);
				}
				if (statefulContainer == null)
				{
					statefulContainer = new BusinessContainer("PageBusinessContainer_" + PageInstanceKey);
					StoreStatefulContainerInSession(dictionary);
				}
			}
			return statefulContainer;
		}
		set
		{
			statefulContainer = value;
			Dictionary<Guid, TimeStampedContainer> containerList = (Session["PageBusinessContainer"] as Dictionary<Guid, TimeStampedContainer>) ?? new Dictionary<Guid, TimeStampedContainer>();
			StoreStatefulContainerInSession(containerList);
		}
	}

	public bool PreserveStatefulBusinessContainer
	{
		get
		{
			if (ViewState["PreserveStatefulBusinessContainer"] != null)
			{
				return (bool)ViewState["PreserveStatefulBusinessContainer"];
			}
			if (base.Request.QueryString["PreserveStatefulBusinessContainer"] != null)
			{
				bool flag = bool.Parse(base.Request.QueryString["PreserveStatefulBusinessContainer"]);
				ViewState["PreserveStatefulBusinessContainer"] = flag;
				return flag;
			}
			return false;
		}
		set
		{
			ViewState["PreserveStatefulBusinessContainer"] = value;
		}
	}

	public bool Enabled
	{
		get
		{
			if (ViewState["Enabled"] == null)
			{
				return true;
			}
			return (bool)ViewState["Enabled"];
		}
		set
		{
			ViewState["Enabled"] = value;
			foreach (IUserControl childUserControl in ChildUserControls)
			{
				childUserControl.Enabled = value;
			}
		}
	}

	public virtual bool EnabledInDesignMode => false;

	public bool ReadOnly
	{
		get
		{
			if (ViewState["ReadOnly"] != null)
			{
				return (bool)ViewState["ReadOnly"];
			}
			return false;
		}
		set
		{
			ViewState["ReadOnly"] = value;
			if (!value)
			{
				return;
			}
			foreach (IUserControl childUserControl in ChildUserControls)
			{
				childUserControl.ReadOnly = true;
			}
		}
	}

	public bool IsDirty
	{
		get
		{
			bool flag = ViewState["IsDirty"] != null && (bool)ViewState["IsDirty"];
			if (!flag)
			{
				foreach (IUserControl childUserControl in ChildUserControls)
				{
					if (childUserControl.IsDirty)
					{
						return true;
					}
				}
			}
			return flag;
		}
		set
		{
			ViewState["IsDirty"] = value;
		}
	}

	public virtual TemplateType TemplateType
	{
		get
		{
			if (base.Request["TemplateType"] != null)
			{
				ViewState["TemplateType"] = Enum.Parse(typeof(TemplateType), base.Request["TemplateType"]);
			}
			if (ViewState["TemplateType"] != null)
			{
				return (TemplateType)ViewState["TemplateType"];
			}
			return TextOnlyMode ? TemplateType.T : TemplateType.A;
		}
	}

	public bool DialogMode
	{
		get
		{
			if (base.Request["DialogMode"] != null)
			{
				ViewState["DialogMode"] = bool.Parse(base.Request["DialogMode"]);
			}
			if (ViewState["DialogMode"] != null)
			{
				return (bool)ViewState["DialogMode"];
			}
			return false;
		}
	}

	private static bool PageContainsTextOnlyButton
	{
		get
		{
			if (HttpContext.Current == null)
			{
				return false;
			}
			if (!(HttpContext.Current.Handler is Page page))
			{
				return false;
			}
			return page.Master is MasterPageBase masterPageBase && masterPageBase.ShowTextOnly;
		}
	}

	public static bool TextOnlyMode
	{
		get
		{
			if (!PageContainsTextOnlyButton)
			{
				return false;
			}
			if (HttpContext.Current.User.Identity.IsAuthenticated)
			{
				return (bool)HttpContext.Current.Profile.GetPropertyValue("CM.TextOnly");
			}
			HttpCookie httpCookie = HttpContext.Current.Request.Cookies["CM.TextOnly"];
			return httpCookie != null && bool.Parse(httpCookie.Value);
		}
		set
		{
			if (HttpContext.Current.User.Identity.IsAuthenticated)
			{
				HttpContext.Current.Profile.SetPropertyValue("CM.TextOnly", value);
				return;
			}
			HttpCookie httpCookie = HttpContext.Current.Request.Cookies["CM.TextOnly"];
			if (httpCookie == null)
			{
				HttpContext.Current.Response.Cookies.Add(new HttpCookie("CM.TextOnly", value.ToString(CultureInfo.InvariantCulture)));
			}
			else
			{
				HttpContext.Current.Response.Cookies.Set(new HttpCookie("CM.TextOnly", value.ToString(CultureInfo.InvariantCulture)));
			}
		}
	}

	public virtual PageOperation PageOperation
	{
		get
		{
			if (base.Request["iOperation"] != null)
			{
				ViewState["iOperation"] = Enum.Parse(typeof(PageOperation), base.Request["iOperation"], ignoreCase: true);
			}
			if (ViewState["iOperation"] != null)
			{
				return (PageOperation)ViewState["iOperation"];
			}
			return PageOperation.None;
		}
		set
		{
			ViewState["iOperation"] = value;
		}
	}

	public virtual bool ObjectBrowserEmbeddedMode
	{
		get
		{
			if (base.Request["ObjectBrowserEmbeddedMode"] != null)
			{
				ViewState["ObjectBrowserEmbeddedMode"] = bool.Parse(base.Request["ObjectBrowserEmbeddedMode"]);
			}
			if (ViewState["ObjectBrowserEmbeddedMode"] != null)
			{
				return (bool)ViewState["ObjectBrowserEmbeddedMode"];
			}
			return false;
		}
		set
		{
			ViewState["ObjectBrowserEmbeddedMode"] = value;
		}
	}

	public bool CloseWindowOnCommit
	{
		get
		{
			if (base.Request["CloseWindowOnCommit"] != null)
			{
				ViewState["CloseWindowOnCommit"] = bool.Parse(base.Request["CloseWindowOnCommit"]);
			}
			if (ViewState["CloseWindowOnCommit"] != null)
			{
				return (bool)ViewState["CloseWindowOnCommit"];
			}
			return false;
		}
		set
		{
			ViewState["CloseWindowOnCommit"] = value;
		}
	}

	public virtual string OnPostCommitClientScript
	{
		get
		{
			string text = string.Empty;
			if (ViewState["OnPostCommitClientScript"] != null)
			{
				text = (string)ViewState["OnPostCommitClientScript"];
			}
			if (CloseWindowOnCommit)
			{
				return text + ";CloseRadWindow();";
			}
			return text;
		}
		set
		{
			ViewState["OnPostCommitClientScript"] = value;
		}
	}

	public bool IsCtrl => base.Request.Form["__CTRLKEY"] != null && base.Request.Form["__CTRLKEY"] == "true";

	public bool IsShift => base.Request.Form["__SHIFTKEY"] != null && base.Request.Form["__SHIFTKEY"] == "true";

	public virtual bool AjaxAnimationsEnabled
	{
		get
		{
			if (ViewState["AjaxAnimationsEnabled"] != null)
			{
				return (bool)ViewState["AjaxAnimationsEnabled"];
			}
			return true;
		}
		set
		{
			ViewState["AjaxAnimationsEnabled"] = value;
		}
	}

	public virtual bool AjaxChildrenAsTriggers
	{
		get
		{
			if (ViewState["AjaxChildrenAsTriggers"] != null)
			{
				return (bool)ViewState["AjaxChildrenAsTriggers"];
			}
			return true;
		}
		set
		{
			ViewState["AjaxChildrenAsTriggers"] = value;
		}
	}

	public virtual string AtomName
	{
		get
		{
			if (ViewState["AtomName"] == null)
			{
				if (Atom != null)
				{
					ViewState["AtomName"] = Atom.Name;
				}
				else if (!string.IsNullOrEmpty(base.Request["AtomName"]))
				{
					ViewState["AtomName"] = base.Request["AtomName"];
				}
				else
				{
					EnsureAtom();
					if (Atom != null)
					{
						ViewState["AtomName"] = Atom.Name;
					}
				}
			}
			if (ViewState["AtomName"] != null)
			{
				return (string)ViewState["AtomName"];
			}
			return string.Empty;
		}
		set
		{
			ViewState["AtomName"] = value;
			atom = null;
			EnsureAtom();
		}
	}

	public Website iMISWebsite
	{
		get
		{
			if (mImisWebsite != null && ((BusinessItem)((AtomBaseSerializationNeutral)mImisWebsite).Document).HasState(DataRowState.Detached))
			{
				mImisWebsite = null;
				EnsureWebsite();
			}
			return mImisWebsite;
		}
		set
		{
			mImisWebsite = value;
		}
	}

	public bool IseCMPage => iMISWebsite == null;

	public bool ShowSurfToEditButton
	{
		get
		{
			if (ViewState["ShowSurfToEditButton"] != null)
			{
				return (bool)ViewState["ShowSurfToEditButton"] && !PreviewMode;
			}
			return false;
		}
		set
		{
			ViewState["ShowSurfToEditButton"] = value;
			if (enableSurfToEditButton != null)
			{
				enableSurfToEditButton.Visible = value && !SurfToEditEnabled && !PreviewMode;
				disableSurfToEditButton.Visible = value && SurfToEditEnabled && !PreviewMode;
			}
		}
	}

	public bool SurfToEditEnabled
	{
		get
		{
			if (PreviewMode)
			{
				return false;
			}
			if (ViewState["SurfToEditEnabled"] != null)
			{
				return (bool)ViewState["SurfToEditEnabled"];
			}
			ProfileBase userProfile = UserProfile;
			if (userProfile != null)
			{
				object propertyValue = userProfile.GetPropertyValue("CM.EnableSurfToEdit");
				if (propertyValue != null)
				{
					return (bool)propertyValue;
				}
			}
			return false;
		}
		set
		{
			ViewState["SurfToEditEnabled"] = value;
			if (enableSurfToEditButton != null)
			{
				enableSurfToEditButton.Visible = ShowSurfToEditButton && !value;
				disableSurfToEditButton.Visible = ShowSurfToEditButton && value;
			}
			ProfileBase userProfile = UserProfile;
			if (userProfile != null)
			{
				userProfile.SetPropertyValue("CM.EnableSurfToEdit", value);
				userProfile.Save();
			}
		}
	}

	public TextAlign SidebarPosition
	{
		get
		{
			return (TextAlign)(ViewState["TextAlign"] ?? ((object)TextAlign.Left));
		}
		set
		{
			ViewState["TextAlign"] = value;
		}
	}

	public ProfileBase UserProfile
	{
		get
		{
			if (Context.User == null || !Context.User.Identity.IsAuthenticated)
			{
				return null;
			}
			if (mMembershipUser == null)
			{
				mMembershipUser = Membership.GetUser(userIsOnline: false);
			}
			return (mMembershipUser == null) ? null : ProfileBase.Create(mMembershipUser.UserName);
		}
	}

	public static bool PreviewMode
	{
		get
		{
			if (HttpContext.Current != null && HttpContext.Current.Items["PreviewMode"] != null)
			{
				return (bool)HttpContext.Current.Items["PreviewMode"];
			}
			return false;
		}
		set
		{
			HttpContext.Current.Items["PreviewMode"] = value;
		}
	}

	public int CommitSequence { get; set; }

	public virtual bool IsCachedPage => false;

	public bool LocalizationEnabled
	{
		get
		{
			if (Page.Master is MasterPageBase masterPageBase)
			{
				return masterPageBase.ShouldEnableTranslation() && masterPageBase.SelectedCulture.Name.Substring(0, 2) != "en" && masterPageBase.IsCurrentCultureInDropDown();
			}
			return false;
		}
	}

	public bool ShouldTranslatePageTitle
	{
		get
		{
			if (base.Request["ShouldTranslatePageTitle"] != null)
			{
				ViewState["ShouldTranslatePageTitle"] = bool.Parse(base.Request["ShouldTranslatePageTitle"]);
			}
			if (ViewState["ShouldTranslatePageTitle"] != null)
			{
				return (bool)ViewState["ShouldTranslatePageTitle"];
			}
			return true;
		}
		set
		{
			ViewState["ShouldTranslatePageTitle"] = value;
		}
	}

	private string InitialTitle
	{
		get
		{
			string result = string.Empty;
			if (ViewState["InitialTitle"] != null)
			{
				result = (string)ViewState["InitialTitle"];
			}
			return result;
		}
		set
		{
			ViewState["InitialTitle"] = value;
		}
	}

	protected MembershipManager MembershipManager
	{
		get
		{
			//IL_0012: Unknown result type (might be due to invalid IL or missing references)
			//IL_0017: Unknown result type (might be due to invalid IL or missing references)
			//IL_0019: Expected O, but got Unknown
			//IL_001e: Expected O, but got Unknown
			MembershipManager obj = membershipmanager;
			if (obj == null)
			{
				MembershipManager val = new MembershipManager(EntityManager);
				MembershipManager val2 = val;
				membershipmanager = val;
				obj = val2;
			}
			return obj;
		}
	}

	private static BusinessContainer StaticBusinessContainer
	{
		get
		{
			if (SiteMapProviderBase.SiteMapProvider != null)
			{
				return SiteMapProviderBase.SiteMapProvider.BusinessContainer;
			}
			return AppContext.CurrentContext.StatelessBusinessContainer;
		}
	}

	[ExcludeFromCodeCoverage]
	protected EntityManager EntityManager
	{
		get
		{
			//IL_0016: Unknown result type (might be due to invalid IL or missing references)
			//IL_001b: Unknown result type (might be due to invalid IL or missing references)
			//IL_001d: Expected O, but got Unknown
			//IL_0022: Expected O, but got Unknown
			EntityManager obj = entityManager;
			if (obj == null)
			{
				EntityManager val = new EntityManager(AppContext.CurrentIdentity.UserId);
				EntityManager val2 = val;
				entityManager = val;
				obj = val2;
			}
			return obj;
		}
	}

	[ExcludeFromCodeCoverage]
	protected string MembershipSettingsCountryCode
	{
		get
		{
			string text = MembershipManager.MembershipSettings.DefaultCountry.CountryCode;
			if (int.TryParse(text, out var _))
			{
				text = "US";
			}
			return text;
		}
	}

	public event CommandButtonEventHandler CommandButtonClicked;

	public event UserControlErrorEventHandler UserControlError;

	public event EventHandler PreCommitEvent;

	public event OnBehalfOfChangedEventHandler OnBehalfOfChanged;

	private BusinessContainer GetContainerFromList(Dictionary<Guid, TimeStampedContainer> containerList)
	{
		bool flag = false;
		TimeStampedContainer value = containerList[PageInstanceKey];
		foreach (KeyValuePair<Guid, TimeStampedContainer> container in containerList)
		{
			if (!container.Key.Equals(PageInstanceKey) && container.Value.TimeStamp > value.TimeStamp)
			{
				flag = true;
				break;
			}
		}
		if (flag)
		{
			value.TimeStamp = AppTime.Now;
			containerList[pageInstanceKey] = value;
			Session["PageBusinessContainer"] = containerList;
		}
		return value.Container;
	}

	private void StoreStatefulContainerInSession(Dictionary<Guid, TimeStampedContainer> containerList)
	{
		if (containerList.Count >= 2)
		{
			DateTime dateTime = DateTime.MaxValue;
			Guid key = Guid.Empty;
			foreach (KeyValuePair<Guid, TimeStampedContainer> container in containerList)
			{
				if (container.Value.TimeStamp < dateTime)
				{
					dateTime = container.Value.TimeStamp;
					key = container.Key;
				}
			}
			containerList.Remove(key);
		}
		containerList[PageInstanceKey] = new TimeStampedContainer(AppTime.Now, statefulContainer);
		Session["PageBusinessContainer"] = containerList;
	}

	protected override void Render(HtmlTextWriter writer)
	{
		ReplaceTilde();
		if (HttpContext.Current.Items.Contains("VirtualUrl"))
		{
			string originalPathAndQuery = BaseUrlRewriter.OriginalPathAndQuery;
			if (originalPathAndQuery != null)
			{
				writer = new FormFixerHtmlTextWriter(writer, originalPathAndQuery);
			}
		}
		base.Render(writer);
	}

	internal void EnsureWebsiteInternal()
	{
		EnsureWebsite();
	}

	protected void EnsureWebsite()
	{
		if (mImisWebsite != null)
		{
			return;
		}
		BusinessContainer val = ((SiteMapProviderBase.SiteMapProvider == null) ? AppContext.CurrentContext.StatefulBusinessContainer : (PreviewMode ? SiteMapProviderBase.PreviewSiteMapProvider.BusinessContainer : SiteMapProviderBase.SiteMapProvider.BusinessContainer));
		ImpersonationInformation val2 = SecurityContext.ImpersonateAnonymous();
		try
		{
			if (!string.IsNullOrEmpty(WebsiteKey))
			{
				Guid guid = new Guid(WebsiteKey);
				mImisWebsite = Website.GetFromWebsiteKey(guid, val, !PreviewMode);
			}
			else if (!AppContext.CurrentContext.WebsiteKey.Equals(Guid.Empty))
			{
				mImisWebsite = Website.GetFromWebsiteKey(AppContext.CurrentContext.WebsiteKey, val, !PreviewMode);
			}
			else
			{
				Guid guid2 = ((AppContext.CurrentContext != null) ? AppContext.CurrentContext.HKey : Guid.Empty);
				if (guid2 != Guid.Empty)
				{
					BusinessController val3 = BusinessController.NewBusinessController(val, "NavigationHierarchy");
					BusinessItem val4 = val3[new object[1] { guid2 }];
					if (val4 != null)
					{
						Guid guid3 = val4.GetGuid("WebsiteKey");
						WebsiteKey = guid3.ToString();
						mImisWebsite = Website.GetFromWebsiteKey(guid3, val, !PreviewMode);
					}
				}
				else
				{
					string appRelativeCurrentExecutionFilePath = base.Request.AppRelativeCurrentExecutionFilePath;
					if (File.Exists(base.Server.MapPath(appRelativeCurrentExecutionFilePath)))
					{
						ImpersonationInformation val5 = SecurityContext.Impersonate("MANAGER");
						bool flag = default(bool);
						try
						{
							mImisWebsite = Website.FindWebsiteByURL(base.Request.Url, !PreviewMode, ref flag);
						}
						finally
						{
							((IDisposable)val5)?.Dispose();
						}
						if ((flag || mImisWebsite == null) && base.Request.UrlReferrer != null)
						{
							mImisWebsite = Website.FindWebsiteByURL(base.Request.UrlReferrer, !PreviewMode, ref flag);
						}
					}
					else
					{
						string text = ((appRelativeCurrentExecutionFilePath != null) ? appRelativeCurrentExecutionFilePath.Substring(2, appRelativeCurrentExecutionFilePath.IndexOf("/", 2, StringComparison.Ordinal) - 2) : string.Empty);
						mImisWebsite = Website.FindWebsiteByName(text, !PreviewMode);
					}
				}
			}
			if (mImisWebsite != null && AppContext.CurrentContext != null)
			{
				AppContext.CurrentContext["WebsiteKey"] = mImisWebsite.WebsiteKey;
				AppContext.CurrentContext["PerspectiveKey"] = mImisWebsite.PerspectiveKey;
				AppContext.CurrentContext["RootHierarchyKey"] = mImisWebsite.RootHierarchyKey;
			}
		}
		finally
		{
			((IDisposable)val2)?.Dispose();
		}
	}

	protected void EnsureMasterPage()
	{
		bool flag = Utilities.IsStaffSite(this) || Utilities.IsWCMSite(this);
		if (flag)
		{
			MasterPageFile = "~/Templates/MasterPages/iMIS-Default.master";
		}
		else if (!string.IsNullOrEmpty(ConfigurationManager.AppSettings["PublicSiteMasterPageFile"]))
		{
			MasterPageFile = ConfigurationManager.AppSettings["PublicSiteMasterPageFile"];
		}
		else
		{
			MasterPageFile = "~/Templates/MasterPages/Empty.master";
		}
		switch (TemplateType)
		{
		case TemplateType.D:
			if (flag && mImisWebsite != null && !string.IsNullOrEmpty(mImisWebsite.DialogMasterPageFileName) && File.Exists(HttpContext.Current.Server.MapPath(Path.Combine("~/Templates/MasterPages/", mImisWebsite.DialogMasterPageFileName))))
			{
				MasterPageFile = "~/Templates/MasterPages/" + mImisWebsite.DialogMasterPageFileName;
			}
			else
			{
				MasterPageFile = "~/Templates/MasterPages/Empty.master";
			}
			break;
		case TemplateType.P:
			if (flag && mImisWebsite != null)
			{
				if (!string.IsNullOrEmpty(mImisWebsite.PrinterMasterPageFileName) && File.Exists(HttpContext.Current.Server.MapPath(Path.Combine("~/Templates/MasterPages/", mImisWebsite.PrinterMasterPageFileName))))
				{
					MasterPageFile = "~/Templates/MasterPages/" + mImisWebsite.PrinterMasterPageFileName;
				}
				else if (File.Exists(HttpContext.Current.Server.MapPath(Path.Combine("~/Templates/MasterPages/", mImisWebsite.MasterPageFileName))))
				{
					MasterPageFile = "~/Templates/MasterPages/" + mImisWebsite.MasterPageFileName;
				}
			}
			break;
		case TemplateType.T:
			if (flag && mImisWebsite != null)
			{
				if (!string.IsNullOrEmpty(mImisWebsite.TextMasterPageFileName) && File.Exists(HttpContext.Current.Server.MapPath(Path.Combine("~/Templates/MasterPages/", mImisWebsite.TextMasterPageFileName))))
				{
					MasterPageFile = "~/Templates/MasterPages/" + mImisWebsite.TextMasterPageFileName;
				}
				else if (File.Exists(HttpContext.Current.Server.MapPath(Path.Combine("~/Templates/MasterPages/", mImisWebsite.MasterPageFileName))))
				{
					MasterPageFile = "~/Templates/MasterPages/" + mImisWebsite.MasterPageFileName;
				}
			}
			break;
		case TemplateType.E:
			MasterPageFile = "~/Templates/MasterPages/Empty.master";
			break;
		case TemplateType.F:
			MasterPageFile = "~/Templates/MasterPages/Portfolio.master";
			break;
		default:
			if (flag && mImisWebsite != null && File.Exists(HttpContext.Current.Server.MapPath(Path.Combine("~/Templates/MasterPages/", mImisWebsite.MasterPageFileName))))
			{
				MasterPageFile = "~/Templates/MasterPages/" + mImisWebsite.MasterPageFileName;
			}
			break;
		}
	}

	protected void EnsureTheme()
	{
		string text = ((HttpContext.Current != null && HttpContext.Current.Profile != null && HttpContext.Current.Profile.GetPropertyValue("UI.Theme") != null) ? ((string)HttpContext.Current.Profile.GetPropertyValue("UI.Theme")) : string.Empty);
		string text2 = SystemConfig.GetString("PublicSiteTheme", (string)null);
		if (string.IsNullOrEmpty(text) && base.Request.QueryString["PreviewTheme"] != null)
		{
			text = base.Request.QueryString["PreviewTheme"];
		}
		if (!string.IsNullOrEmpty(text))
		{
			Theme = text;
		}
		else if ((Utilities.IsStaffSite(this) || Utilities.IsWCMSite(this)) && mImisWebsite != null)
		{
			Theme = mImisWebsite.DefaultThemeName;
		}
		else if (!string.IsNullOrEmpty(text2))
		{
			Theme = text2;
		}
		else if (string.IsNullOrEmpty(Page.Theme))
		{
			if (!string.IsNullOrEmpty(ConfigurationManager.AppSettings["PublicSiteTheme"]))
			{
				Theme = ConfigurationManager.AppSettings["PublicSiteTheme"];
			}
			else
			{
				Theme = "UltraWave";
			}
		}
	}

	protected override void OnPreInit(EventArgs e)
	{
		EnsureWebsite();
		EnsureMasterPage();
		base.OnPreInit(e);
		EnsureTheme();
		EnsureAppContext();
		if (!base.IsPostBack || AppContext.CurrentContext.HKey == Guid.Empty)
		{
			SetContext(this);
		}
	}

	protected override void OnInit(EventArgs e)
	{
		bool flag = Session["NewSession"] != null;
		Session["NewSession"] = null;
		if (base.Adapter != null && base.Adapter.GetType().Name.Equals("AsiPageAdapter") && flag && !base.Request.HttpMethod.Equals("GET") && Session["__VIEWSTATEQUEUE"] == null)
		{
			string userId = AppContext.CurrentIdentity.UserId;
			Security.RevokeAppContext(HttpContext.Current);
			RedirectToLogin(this, isSecure: false, userId != "GUEST", base.Request.RawUrl);
		}
		base.OnInit(e);
		if (RequireAuthenticatedUser && (AppPrincipal.CurrentPrincipal == null || !AppPrincipal.CurrentIdentity.IsAuthenticated || AppPrincipal.CurrentIdentity.UserId == "GUEST"))
		{
			RedirectToLogin(this, isSecure: false, base.Request.RawUrl);
		}
		if (AppContext.CurrentIdentity.UserId != "GUEST")
		{
			base.ViewStateUserKey = Session.SessionID;
		}
		EnsureChildControls();
	}

	protected override void CreateChildControls()
	{
		base.CreateChildControls();
		CreateEasyEditControl();
	}

	private void CreateEasyEditControl()
	{
		if (base.Master != null && base.Master.FindControl("AuxiliaryNavigationSupplementalContent") is ContentPlaceHolder contentPlaceHolder)
		{
			enableSurfToEditButton = new LinkButton
			{
				CausesValidation = false,
				Text = "Enable easy edit"
			};
			enableSurfToEditButton.Click += SurfToEditButtonClick;
			enableSurfToEditButton.CssClass = "ste-toggle off";
			enableSurfToEditButton.ToolTip = ResourceManager.GetPhrase("TurnOnEasyEdit", "Easy edit is off. Click to turn it on.");
			contentPlaceHolder.Controls.Add(enableSurfToEditButton);
			disableSurfToEditButton = new LinkButton
			{
				CausesValidation = false,
				Text = "Disable easy edit"
			};
			disableSurfToEditButton.Click += SurfToEditButtonClick;
			disableSurfToEditButton.CssClass = "ste-toggle on";
			disableSurfToEditButton.ToolTip = ResourceManager.GetPhrase("TurnOffEasyEdit", "Easy edit is on. Click to turn it off.");
			contentPlaceHolder.Controls.Add(disableSurfToEditButton);
		}
	}

	protected override void InitializeCulture()
	{
		base.InitializeCulture();
		MasterPageBase masterPageBase = (MasterPageBase)Page.Master;
		if (masterPageBase != null)
		{
			CultureInfo selectedCulture = masterPageBase.SelectedCulture;
			if (!selectedCulture.Equals(Thread.CurrentThread.CurrentUICulture))
			{
				Thread.CurrentThread.CurrentUICulture = selectedCulture;
				Thread.CurrentThread.CurrentCulture = selectedCulture;
			}
		}
	}

	private void SurfToEditButtonClick(object sender, EventArgs e)
	{
		SurfToEditEnabled = !SurfToEditEnabled;
		base.Response.Redirect(base.Request.Url.ToString());
	}

	protected override void OnLoad(EventArgs e)
	{
		base.OnLoad(e);
		ScriptManager current = ScriptManager.GetCurrent(this);
		if (base.Header != null)
		{
			string path;
			string path2;
			if (current != null && current.IsDebuggingEnabled)
			{
				path = ((!string.IsNullOrEmpty(ConfigurationManager.AppSettings["jQueryURLDebug"])) ? ConfigurationManager.AppSettings["jQueryURLDebug"] : "~/AsiCommon/Scripts/Jquery/Jquery.js");
				path2 = ((!string.IsNullOrEmpty(ConfigurationManager.AppSettings["jQueryURLDebug"])) ? ConfigurationManager.AppSettings["jQueryURLDebug"] : "~/AsiCommon/Scripts/Jquery/jquery-migrate-3.0.1.js");
			}
			else
			{
				path = ((!string.IsNullOrEmpty(ConfigurationManager.AppSettings["jQueryURLRelease"])) ? ConfigurationManager.AppSettings["jQueryURLRelease"] : "~/AsiCommon/Scripts/Jquery/Jquery.min.js");
				path2 = ((!string.IsNullOrEmpty(ConfigurationManager.AppSettings["jQueryURLRelease"])) ? ConfigurationManager.AppSettings["jQueryURLRelease"] : "~/AsiCommon/Scripts/Jquery/jquery-migrate-3.0.1.min.js");
			}
			base.Header.Controls.Add(BuildScriptControl(path));
			base.Header.Controls.Add(BuildScriptControl(path2));
			base.Header.Controls.Add(BuildScriptControl("~/AsiCommon/Scripts/Jquery/jquery-ui.custom.min.js"));
			bool result = default(bool);
			if (!string.IsNullOrEmpty(ConfigurationManager.AppSettings["UseAngularJs"]) && bool.TryParse(ConfigurationManager.AppSettings["UseAngularJs"], out result) && result)
			{
				StringBuilder stringBuilder = new StringBuilder();
				stringBuilder.AppendLine(BuildScriptNode("~/AsiCommon/Scripts/AngularBundles/angular-bundle.min.js", ScriptLoadAttribute.Defer));
				stringBuilder.AppendLine(BuildScriptNode("~/AsiCommon/Scripts/AngularBundles/angular-spin-bundle.min.js", ScriptLoadAttribute.Defer));
				stringBuilder.AppendLine(BuildScriptNode("~/AsiCommon/Scripts/AngularBundles/asi-core-bundle.min.js", ScriptLoadAttribute.Defer));
				if (Page is DisplayPageBase { iMISWebsite: not null } displayPageBase && displayPageBase.iMISWebsite.WebsiteKey != Guid.Parse("FBDF17A3-CAE7-4943-B1EB-71B9C0DD65D2") && displayPageBase.iMISWebsite.WebsiteKey != Guid.Parse("FAD2FD17-7E27-4C96-BABE-3291ECDE4822"))
				{
					base.Header.Controls.Add(new LiteralControl(WrapInIeExclude(stringBuilder.ToString())));
				}
			}
			ClientConstants clientConstants = GetClientConstants();
			ScriptManager.RegisterHiddenField(Page, "__ClientContext", clientConstants.ToString());
		}
		EnsureAtomObject();
		base.ClientScript.RegisterHiddenField("__CTRLKEY", string.Empty);
		base.ClientScript.RegisterHiddenField("__SHIFTKEY", string.Empty);
		if (!base.IsPostBack)
		{
			InitialTitle = base.Title;
		}
		else if (!string.IsNullOrEmpty(InitialTitle))
		{
			base.Title = InitialTitle;
		}
		DisplayUserMessagesFromQueryString();
	}

	private void DisplayUserMessagesFromQueryString()
	{
		foreach (string item in from queystringKey in base.Request.QueryString.Keys.OfType<string>()
			where queystringKey.StartsWith("DisplayMessage_", StringComparison.OrdinalIgnoreCase)
			select queystringKey)
		{
			if (!(bool.TryParse(base.Request.QueryString[item], out var result) && result) || Session[item] == null)
			{
				continue;
			}
			string text = Session[item] as string;
			if (!string.IsNullOrEmpty(text))
			{
				string value = item.Substring(item.LastIndexOf('_') + 1);
				if (Enum.TryParse<UserControlMessageTypes>(value, out var result2))
				{
					AddUserMessage(new UserControlMessage(result2, text));
					Session[item] = null;
				}
			}
		}
	}

	protected override void OnPreRender(EventArgs e)
	{
		string newValue = Utilities.GetTildeExpansion();
		ScriptManager current = ScriptManager.GetCurrent(this);
		if (current != null)
		{
			if (current.IsDebuggingEnabled)
			{
				if (masterClientScripts.Count == 0)
				{
					lock (masterClientScripts)
					{
						if (masterClientScripts.Count == 0)
						{
							string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "AsiCommon\\Scripts");
							string[] files = Directory.GetFiles(path, "*.js");
							foreach (string path2 in files)
							{
								string fileName = Path.GetFileName(path2);
								if ((string.IsNullOrEmpty(fileName) || string.CompareOrdinal(fileName.ToLowerInvariant(), "asi.js") != 0) && !masterClientScripts.ContainsKey(fileName))
								{
									masterClientScripts.Add(fileName, string.Format(CultureInfo.InvariantCulture, "~/AsiCommon/Scripts/{0}", fileName));
								}
							}
						}
					}
				}
				foreach (KeyValuePair<string, string> masterClientScript in masterClientScripts)
				{
					AddClientScript(masterClientScript.Key, masterClientScript.Value);
				}
			}
			else
			{
				AddClientScript("Asi.js", "~/AsiCommon/scripts/Asi.js");
			}
			current.Scripts.Add(new ScriptReference("MicrosoftAjax.js", "AjaxControlToolkit, Version=4.1.50508, Culture=neutral, PublicKeyToken=28f01b0e84b6d53e"));
			current.Scripts.Add(new ScriptReference("MicrosoftAjaxWebForms.js", "AjaxControlToolkit, Version=4.1.50508, Culture=neutral, PublicKeyToken=28f01b0e84b6d53e"));
			foreach (string key in clientScripts.Keys)
			{
				current.Scripts.Add(new ScriptReference(clientScripts[key].Replace("~", newValue)));
			}
		}
		base.OnPreRender(e);
		if (AtomObjectPrimaryKey != null && AtomObjectPrimaryKey.Length != 0)
		{
			SetPropertyValue("AtomObjectPrimaryKey" + ClientID, AtomObjectPrimaryKey, this);
		}
		ScriptManager.RegisterHiddenField(this, "PageInstanceKey", PageInstanceKey.ToString());
		if (enableSurfToEditButton != null)
		{
			enableSurfToEditButton.Visible = ShowSurfToEditButton && !SurfToEditEnabled;
			disableSurfToEditButton.Visible = ShowSurfToEditButton && SurfToEditEnabled;
		}
	}

	protected override void OnPreRenderComplete(EventArgs e)
	{
		//IL_00be: Unknown result type (might be due to invalid IL or missing references)
		//IL_00c5: Expected O, but got Unknown
		base.OnPreRenderComplete(e);
		MasterPageBase masterPageBase = (MasterPageBase)Page.Master;
		if (masterPageBase != null)
		{
			CultureInfo selectedCulture = masterPageBase.SelectedCulture;
			Thread.CurrentThread.CurrentUICulture = selectedCulture;
		}
		if (!LocalizationEnabled)
		{
			return;
		}
		CultureInfo currentUICulture = Thread.CurrentThread.CurrentUICulture;
		if (currentUICulture.Name.StartsWith("en", StringComparison.OrdinalIgnoreCase))
		{
			return;
		}
		if (localizationLoadCollections || LocalizationManager.SetPhrases == 1)
		{
			localizationLoadCollections = false;
			string firstConfigValue = AppConfig.GetFirstConfigValue("LanguageTranslationID");
			string firstConfigValue2 = AppConfig.GetFirstConfigValue("LanguageTranslationPassword");
			LocalizationManager val = new LocalizationManager("All", currentUICulture.Name.Substring(0, 2), firstConfigValue, firstConfigValue2);
			if (LocalizationManager.SetPhrases > 0)
			{
				val.LoadCollections();
			}
			LocalizationManager.SetPhrases = 0;
		}
		if (!DoTranslate())
		{
			return;
		}
		Type type = Type.GetType("Asi.Localization.PageLocalizer, Asi.Localization", throwOnError: false);
		if (!(type == null))
		{
			AddTranslateAttributeForTooltips();
			object[] args = new object[2]
			{
				"All",
				currentUICulture.Name.Substring(0, 2)
			};
			object obj = Activator.CreateInstance(type, args);
			MethodInfo method = obj.GetType().GetMethod("LocalizeControls");
			method.Invoke(obj, new object[1] { Controls });
			if (Page != null && !string.IsNullOrEmpty(Page.Title) && ShouldTranslatePageTitle)
			{
				Page.Title = GetTranslatedPhrase(Page.Title);
			}
		}
	}

	protected bool DoTranslate()
	{
		string metaKeywords = Page.MetaKeywords;
		if (metaKeywords != null && metaKeywords.Contains("ASINoTranslate"))
		{
			return false;
		}
		string text = Page.Request.QueryString["ASITranslate"];
		if (text != null)
		{
			if (text.ToUpper(CultureInfo.InvariantCulture) == "YES")
			{
				Session["ASITranslate"] = "YES";
			}
			else
			{
				Session["ASITranslate"] = "NO";
			}
		}
		if (Session["ASITranslate"] != null && Session["ASITranslate"].ToString() == "NO")
		{
			return false;
		}
		return true;
	}

	protected virtual void OnCommandButtonClick(object sender, CommandButtonEventArgs e)
	{
		EnsureChildUserControls();
		if (e == null)
		{
			throw new ArgumentNullException("e");
		}
		if (this.CommandButtonClicked != null && !e.CancellationRequest)
		{
			this.CommandButtonClicked(sender, e);
		}
		if (e.CancellationRequest)
		{
			return;
		}
		bool flag = false;
		bool flag2 = false;
		bool flag3 = false;
		switch (e.ButtonType)
		{
		case CommandButtonType.Save:
			flag = Save();
			break;
		case CommandButtonType.SaveAndClose:
			flag = Save();
			flag2 = true;
			break;
		case CommandButtonType.Ok:
			flag = Ok();
			flag2 = true;
			break;
		case CommandButtonType.Cancel:
			Cancel();
			flag3 = true;
			break;
		case CommandButtonType.Continue:
			Save();
			break;
		case CommandButtonType.Close:
			flag = true;
			flag2 = true;
			break;
		}
		if (flag)
		{
			string text = base.Request["ButtonId"] ?? string.Empty;
			string text2 = "try{ finish('" + text + "'); } catch(e){ /*do nothing*/ }";
			if (e.CloseDialogWindow || flag2)
			{
				text2 += string.Format(CultureInfo.InvariantCulture, "var oArg = new Object();oArg.cancel = {0};", flag3.ToString().ToLowerInvariant());
				text2 = ((TemplateType != TemplateType.P) ? (text2 + "var oWindow = GetRadWindow();if (oWindow != null) {{ oWindow.IsDirty=" + IsDirty.ToString(CultureInfo.InvariantCulture).ToLower(CultureInfo.CurrentCulture) + ";oWindow.Close(oArg); }}") : (text2 + "if (window.opener) window.close(oArg);"));
			}
			ScriptManager.RegisterStartupScript(this, GetType(), "Finish", text2, addScriptTags: true);
		}
	}

	public void DisplayArgs(ValidateArgs vArgs, PreCommitArgs pcArgs, Exception ex)
	{
		if (vArgs != null)
		{
			ValidationEntry[] entries = vArgs.Entries;
			foreach (ValidationEntry validationEntry in entries)
			{
				AddUserMessage(new UserControlMessage(GetType().FullName, UserControlMessageTypes.Error, validationEntry.Message));
			}
		}
		if (pcArgs != null)
		{
			CancellationEntry[] entries2 = pcArgs.Entries;
			foreach (CancellationEntry cancellationEntry in entries2)
			{
				AddUserMessage(new UserControlMessage(GetType().FullName, UserControlMessageTypes.Error, cancellationEntry.Message));
			}
		}
		if (ex != null)
		{
			AddUserMessage(new UserControlMessage(ex.StackTrace, UserControlMessageTypes.Error, ex.Message));
		}
	}

	private void ReplaceTilde()
	{
		string text = ResolveClientUrl("~");
		int num = 0;
		string[] array = text.Split('/');
		foreach (string text2 in array)
		{
			if (text2 == "..")
			{
				num++;
				continue;
			}
			break;
		}
		string text3 = base.Request.CurrentExecutionFilePath.TrimStart('/');
		int num2 = text3.Split('/').Length - 1;
		if (num < num2)
		{
			return;
		}
		foreach (Control control in Controls)
		{
			ReplaceTilde(control);
		}
	}

	private void ReplaceTilde(Control control)
	{
		if (control is HyperLink hyperLink && hyperLink.ImageUrl.StartsWith("~/"))
		{
			hyperLink.ImageUrl = hyperLink.ImageUrl.Replace("~", Utilities.GetTildeExpansion());
		}
		foreach (Control control2 in control.Controls)
		{
			ReplaceTilde(control2);
		}
	}

	private ClientConstants GetClientConstants()
	{
		string baseUrl = base.Request.ApplicationPath ?? string.Empty;
		ClientConstants clientConstants = new ClientConstants
		{
			BaseUrl = baseUrl,
			IsAnonymous = (AppPrincipal.CurrentIdentity == null || !AppPrincipal.CurrentIdentity.IsAuthenticated || string.Equals(AppPrincipal.CurrentIdentity.UserId, "GUEST", StringComparison.Ordinal)),
			LoggedInPartyId = SecurityHelper.GetLoggedInUser(),
			SelectedPartyId = SecurityHelper.GetSelectedImisId()
		};
		if (Page is DisplayPageBase { iMISWebsite: not null } displayPageBase)
		{
			clientConstants.WebsiteRoot = displayPageBase.iMISWebsite.WebsiteBaseUrl;
		}
		return clientConstants;
	}

	private string BuildScriptNode(string path, ScriptLoadAttribute loadAttribute = ScriptLoadAttribute.None)
	{
		string arg = ((loadAttribute == ScriptLoadAttribute.None) ? string.Empty : loadAttribute.ToString().ToLowerInvariant());
		return string.Format(CultureInfo.InvariantCulture, "<script src=\"{0}\" type=\"text/javascript\" {1}></script>", Page.ResolveUrl(path), arg);
	}

	private LiteralControl BuildScriptControl(string path)
	{
		string text = BuildScriptNode(path);
		return new LiteralControl(text);
	}

	private static string WrapInIeExclude(string html)
	{
		return string.Format(CultureInfo.InvariantCulture, "<!--[if !IE 8]><!-->{0}<!--<![endif]-->", html);
	}

	private void DataSourceBoundCallback(IEnumerable data)
	{
		AtomObject = ConvertIEnumerableToIAtomArray(data);
	}

	private static bool GetConfigBool(string parameter)
	{
		string firstConfigValue = AppConfig.GetFirstConfigValue(parameter);
		if (firstConfigValue == null)
		{
			return false;
		}
		if (!bool.TryParse(firstConfigValue, out var result))
		{
			return false;
		}
		return result;
	}

	private void AddTranslateAttributeForTooltips()
	{
		if (base.IsPostBack)
		{
			return;
		}
		Control[] array = Utilities.FindControls(this, typeof(LinkButton));
		Control[] array2 = array;
		foreach (Control control in array2)
		{
			if (!(control.NamingContainer is BusinessDataGrid2) && !(control.NamingContainer is RadScheduler))
			{
				LinkButton linkButton = (LinkButton)control;
				string text = linkButton.Attributes["translate"];
				if (text == null)
				{
					linkButton.Attributes["translate"] = "yes";
				}
			}
		}
	}

	public void AddClientScript(string key, string url)
	{
		if (!clientScripts.Keys.Contains(key))
		{
			clientScripts.Add(key, url);
		}
	}

	public string GetBaseUrl()
	{
		return GetBaseUrl(base.Request.IsSecureConnection);
	}

	public void Cancel()
	{
		if (!string.IsNullOrEmpty(CancelUrl))
		{
			base.Response.Redirect(CancelUrl, endResponse: false);
		}
	}

	public bool Ok()
	{
		Validate();
		if (!base.IsValid)
		{
			string phrase = ResourceManager.GetPhrase("InputValidationFailed", "There was some invalid input on the page");
			AddUserMessage(new UserControlMessage(GetType().FullName, UserControlMessageTypes.Error, phrase));
			return false;
		}
		ValidateArgs vArgs;
		PreCommitArgs pcArgs;
		Exception excp;
		bool flag = Ok(out vArgs, out pcArgs, out excp);
		if (flag && CloseWindowOnCommit)
		{
			string script = string.Format(CultureInfo.InvariantCulture, "var oWindow = {0}; oWindow.IsDirty = {1}; oWindow.Close();", "GetRadWindow()", StringUtilities.GetLowercaseString(IsDirty));
			ScriptManager.RegisterStartupScript(this, GetType(), GetType().FullName + ".CloseWindow", script, addScriptTags: true);
		}
		DisplayArgs(vArgs, pcArgs, excp);
		return flag;
	}

	public bool Ok(out ValidateArgs vArgs, out PreCommitArgs pcArgs, out Exception excp)
	{
		return UserControlBase.Ok(this, out vArgs, out pcArgs, out excp);
	}

	public bool Save()
	{
		ValidateArgs vArgs;
		PreCommitArgs pcArgs;
		Exception excp;
		bool result = UserControlBase.Save(this, out vArgs, out pcArgs, out excp);
		DisplayArgs(vArgs, pcArgs, excp);
		IsDirty = true;
		return result;
	}

	public virtual void Validate(ValidateArgs e)
	{
		UserControlBase.Validate(this, e);
	}

	public virtual void CommandButtonRequisites(CommandButtonRequisiteArgs e)
	{
		foreach (IUserControl childUserControl in ChildUserControls)
		{
			childUserControl.CommandButtonRequisites(e);
		}
		if (ObjectBrowserEmbeddedMode)
		{
			if (e == null)
			{
				throw new ArgumentNullException("e");
			}
			e.SetHide(CommandButtonType.Cancel);
		}
	}

	protected internal virtual void CheckButtonPermissions(CommandButtonRequisiteArgs commandButtonRequisiteArgs)
	{
		EnsureAtomObject();
		if (ArrayExtensionMethods.IsNullOrEmpty((IList)AtomObject))
		{
			return;
		}
		IAtom[] array = AtomObject;
		foreach (IAtom val in array)
		{
			if (val is DataRow { RowState: var rowState } && rowState.Equals(DataRowState.Detached))
			{
				continue;
			}
			if (!val.HasPermission((AclPermissionType)8))
			{
				if (commandButtonRequisiteArgs == null)
				{
					throw new ArgumentNullException("commandButtonRequisiteArgs");
				}
				commandButtonRequisiteArgs.SetDisabled(CommandButtonType.Save);
				commandButtonRequisiteArgs.SetDisabled(CommandButtonType.SaveAndNew);
				commandButtonRequisiteArgs.SetDisabled(CommandButtonType.SaveAndClose);
			}
			if (!val.HasPermission((AclPermissionType)16))
			{
				if (commandButtonRequisiteArgs == null)
				{
					throw new ArgumentNullException("commandButtonRequisiteArgs");
				}
				commandButtonRequisiteArgs.SetDisabled(CommandButtonType.Delete);
			}
		}
	}

	public void HandleCommandButtonClick(object sender, CommandButtonType buttonType)
	{
		CommandButtonEventArgs e = new CommandButtonEventArgs(buttonType, "Template");
		OnCommandButtonClick(sender, e);
	}

	public bool HandleConstraintViolation(ConstraintViolation cv, bool propertyConstraintEncountered)
	{
		//IL_0002: Unknown result type (might be due to invalid IL or missing references)
		return UserControlBase.HandleConstraintViolation(this, cv, propertyConstraintEncountered);
	}

	public void AddChildUserControl(IUserControl control)
	{
		if (children == null)
		{
			children = new Collection<IUserControl>();
		}
		UserControlBase.AddChildUserControl(this, control);
	}

	protected virtual void EnsureChildUserControls()
	{
		if (children == null)
		{
			children = new Collection<IUserControl>();
		}
	}

	public void AddUserMessage(UserControlMessage message)
	{
		UserControlBase.AddUserMessage(this, message);
	}

	public List<UserControlMessage> GetUserMessages()
	{
		return UserControlBase.GetUserMessages(this);
	}

	public string GetTranslatedPhrase(string phraseIn)
	{
		if (!(Page.Master is MasterPageBase masterPageBase))
		{
			return phraseIn;
		}
		return LocalizationHelper.GetTranslatedText(masterPageBase.SelectedCulture, phraseIn);
	}

	public void OnUserControlError(object sender, UserControlErrorEventArgs e)
	{
		if (this.UserControlError != null)
		{
			this.UserControlError(sender, e);
		}
		foreach (IUserControl childUserControl in ChildUserControls)
		{
			childUserControl.OnUserControlError(sender, e);
		}
	}

	public virtual void Commit()
	{
		UserControlBase.Commit(this);
	}

	public virtual void PreCommit(PreCommitArgs e)
	{
		if (this.PreCommitEvent != null)
		{
			this.PreCommitEvent(this, e);
		}
		UserControlBase.PreCommit(this, e);
	}

	public virtual void PostCommit()
	{
		UserControlBase.PostCommit(this);
		if (CloseWindowOnCommit)
		{
			string script = string.Format(CultureInfo.InvariantCulture, "var oWindow = {0}; oWindow.IsDirty = {1}; oWindow.Close();", "GetRadWindow()", StringUtilities.GetLowercaseString(IsDirty));
			ScriptManager.RegisterStartupScript(this, GetType(), GetType().FullName + ".CloseWindow", script, addScriptTags: true);
		}
	}

	public virtual void EnsureAtom()
	{
		if (!ensuringAtom)
		{
			ensuringAtom = true;
			if (Atom == null && SubjectUniformKey != Guid.Empty)
			{
				Atom = AtomLoader.LoadAtomByUniformKey(SubjectUniformKey);
			}
			if (Atom == null && AtomName.Length > 0)
			{
				Atom = AtomLoader.LoadAtom(AtomName);
			}
			ensuringAtom = false;
		}
	}

	public virtual void EnsureAtomObject()
	{
		if (!ensuringAtomObject)
		{
			ensuringAtomObject = true;
			if (atomObject == null || atomObject.Length == 0)
			{
				LoadAtomObject();
			}
			ensuringAtomObject = false;
		}
	}

	public virtual void LoadAtomObject()
	{
		EnsureAtom();
		AtomObject = LoadAtomObject(this);
	}

	public virtual IAtom CreateAtomObject()
	{
		IAtom val = CreateAtomObject(Atom, Container);
		if (val != null)
		{
			AtomObject = (IAtom[])(object)new IAtom[1] { val };
		}
		return val;
	}

	public string GetPageEventArgument()
	{
		return UserControlBase.GetPageEventArgument(base.Request);
	}

	public void AddWindow(string id, bool modal, int width, int height)
	{
		if (base.Master is MasterPageBase masterPageBase)
		{
			masterPageBase.AddWindow(id, modal, width, height);
		}
	}

	public void HandleOnBehalfOfChanged(object sender, OnBehalfOfChangedEventArgs arguments)
	{
		if (sender == null)
		{
			throw new ArgumentNullException("sender");
		}
		if (arguments == null)
		{
			throw new ArgumentNullException("arguments");
		}
		this.OnBehalfOfChanged?.Invoke(sender, arguments);
	}

	public static void RedirectToLogin(Page page, bool isSecure, string redirectUrl)
	{
		RedirectToLogin(page, isSecure, sessionTimeout: false, redirectUrl);
	}

	public static void RedirectToLogin(Page page, bool isSecure, bool sessionTimeout, string redirectUrl)
	{
		if (page is DisplayPageBase && FormsAuthentication.LoginUrl.IndexOf('~') < 0)
		{
			string baseUrl = GetBaseUrl(page, isSecure);
			string text = FormsAuthentication.LoginUrl;
			string text2 = GetTildeExpansion();
			if (text.ToLower().IndexOf(text2.ToLower(), StringComparison.Ordinal) >= 0)
			{
				text = text.Substring(text.ToLower().IndexOf(text2.ToLower(), StringComparison.Ordinal) + text2.Length);
			}
			text = baseUrl + "/" + text.TrimStart('/');
			if (sessionTimeout)
			{
				text = ((text.IndexOf('?') < 0) ? (text + "?") : (text + "&"));
				text += "SessionTimeout=1";
			}
			if (redirectUrl.Length > 0)
			{
				text = ((text.IndexOf('?') < 0) ? (text + "?") : (text + "&"));
				text = text + "ReturnUrl=" + page.Server.UrlEncode(redirectUrl);
			}
			page.Response.Redirect(text, endResponse: true);
		}
		else
		{
			FormsAuthentication.RedirectToLoginPage();
		}
	}

	internal static string GetTildeExpansion()
	{
		if (tildeExpansion == null)
		{
			string appDomainAppVirtualPath = HttpRuntime.AppDomainAppVirtualPath;
			string text = appDomainAppVirtualPath.ToLower(CultureInfo.InvariantCulture);
			string text2 = appDomainAppVirtualPath.ToUpper(CultureInfo.InvariantCulture);
			tildeExpansion = ((appDomainAppVirtualPath == "/") ? string.Empty : ((text != appDomainAppVirtualPath) ? text : text2));
		}
		return tildeExpansion;
	}

	public static string GetBaseUrl(Page page, bool isSecure)
	{
		if (page is DisplayPageBase)
		{
			return ((DisplayPageBase)page).GetBaseUrl(isSecure);
		}
		return string.Empty;
	}

	public static IAtom[] LoadAtomObject(IUserControl control)
	{
		if (control == null)
		{
			throw new ArgumentNullException("control");
		}
		IAtom[] array = null;
		IAtom val = control.Atom;
		object[] array2 = control.AtomObjectPrimaryKey;
		if (val == null && array2 != null && array2.Length == 1 && array2[0] is Guid)
		{
			val = AtomLoader.LoadAtomByUniformKey((Guid)array2[0]);
		}
		if (val != null && val.Name.Length > 0)
		{
			if (val.IsBusinessItem)
			{
				BusinessController val2 = BusinessController.NewBusinessController(control.Container, val.Name);
				if (array2 != null && array2.Length != 0)
				{
					try
					{
						BusinessItem val3 = val2[array2];
						if (val3 != null)
						{
							array = (IAtom[])(object)new IAtom[1] { (IAtom)val3 };
						}
					}
					catch (BusinessItemLoadException)
					{
					}
				}
			}
			else if (array2 != null && array2.Length != 0)
			{
				IAtomFactory val4 = (IAtomFactory)(object)((val is IAtomFactory) ? val : null);
				if (val4 != null)
				{
					array = (IAtom[])(object)new IAtom[1] { val4.Select((object)array2) };
				}
			}
		}
		if ((array == null || array.Length == 0) && val != null)
		{
			if (control is DisplayPageBase displayPageBase)
			{
				displayPageBase.CreateAtomObject();
			}
			else
			{
				IAtom val5 = CreateAtomObject(val, control.Container);
				if (val5 != null)
				{
					array = (IAtom[])(object)new IAtom[1] { val5 };
				}
			}
		}
		return array;
	}

	public static IAtom CreateAtomObject(IAtom atomDefinition, BusinessContainer container)
	{
		IAtom result = null;
		if (atomDefinition != null)
		{
			if (atomDefinition.IsBusinessItem)
			{
				BusinessController val = BusinessController.NewBusinessController(container, atomDefinition.Name);
				if (atomDefinition.IsTyped)
				{
					Type type = ((object)val).GetType();
					result = (IAtom)((!(type.GetMethod("Add", BindingFlags.InvokeMethod) != null)) ? ((object)CreateViaReflection(atomDefinition)) : ((object)/*isinst with value type is only supported in some contexts*/));
				}
				else
				{
					result = (IAtom)(object)val.Add(new object[0]);
				}
			}
			else
			{
				result = CreateViaReflection(atomDefinition);
			}
		}
		return result;
	}

	private static IAtom CreateViaReflection(IAtom atomDefinition)
	{
		//IL_0034: Unknown result type (might be due to invalid IL or missing references)
		//IL_003b: Expected O, but got Unknown
		Type type = ((object)atomDefinition).GetType();
		ConstructorInfo[] constructors = type.GetConstructors();
		foreach (ConstructorInfo constructorInfo in constructors)
		{
			if (constructorInfo.GetParameters().Length == 0)
			{
				return (IAtom)constructorInfo.Invoke(new object[0]);
			}
		}
		return null;
	}

	public static void EnsureAppContext()
	{
	}

	public static void SetContext(Page currentPage)
	{
		EnsureAppContext();
		AppContext currentContext = AppContext.CurrentContext;
		if (currentPage == null)
		{
			throw new ArgumentNullException("currentPage");
		}
		DisplayPageBase displayPageBase = currentPage as DisplayPageBase;
		if (!currentPage.IsPostBack && displayPageBase != null && !displayPageBase.PreserveStatefulBusinessContainer && (displayPageBase.TemplateType != TemplateType.D || displayPageBase.DialogMode) && displayPageBase.Master is MasterPageBase)
		{
			ScriptManager scriptManager = ((MasterPageBase)displayPageBase.Master).ScriptManager;
			if (scriptManager == null || !scriptManager.IsInAsyncPostBack)
			{
				currentContext.ResetStatefulBusinessContainer();
			}
		}
		if (displayPageBase != null)
		{
			VerifyTemplatePath(displayPageBase, currentContext);
		}
		Guid guid = GetHierarchyKey(currentContext);
		if (guid == Guid.Empty)
		{
			guid = GetHierarchyKeyForPage(currentPage, currentContext.RootHierarchyKey);
		}
		if (guid == Guid.Empty && currentContext.HKey != Guid.Empty)
		{
			guid = currentContext.HKey;
		}
		if (guid == Guid.Empty && !string.IsNullOrEmpty(currentContext.NavigationPath) && currentContext.NavigationPath.IndexOf('?') > 0)
		{
			NameValueCollection nameValueCollection = HttpUtility.ParseQueryString(currentContext.NavigationPath.Split('?')[1]);
			string text = nameValueCollection["hkey"];
			Guid result = Guid.Empty;
			guid = (string.IsNullOrEmpty(text) ? guid : (Guid.TryParse(text, out result) ? result : guid));
		}
		UpdateContextWithHKey(currentPage, guid, currentContext);
		if (displayPageBase != null)
		{
			bool flag = true;
			if (HttpContext.Current != null && !string.IsNullOrEmpty(HttpContext.Current.Request["SetSubjectKey"]))
			{
				flag = bool.Parse(HttpContext.Current.Request["SetSubjectKey"]);
			}
			if (flag)
			{
				Guid subjectUniformKey = displayPageBase.SubjectUniformKey;
				if (subjectUniformKey != Guid.Empty)
				{
					currentContext.SubjectUniformKey = subjectUniformKey;
					currentContext.SubjectName = displayPageBase.SubjectName;
				}
			}
		}
		else if (HttpContext.Current != null && !string.IsNullOrEmpty(HttpContext.Current.Request["iUniformKey"]))
		{
			string text2 = HttpContext.Current.Request["iUniformKey"];
			if (text2.Trim().Length > 0)
			{
				SetSubjectUniformKeyAndName(currentContext, text2);
			}
		}
	}

	private static Guid GetHierarchyKeyForPage(Page currentPage, Guid rootHierarchyKey)
	{
		if (!(currentPage is ContentRecordPage contentRecordPage) || contentRecordPage.ContentRecordKey == Guid.Empty)
		{
			return Guid.Empty;
		}
		return DocumentSystem.HierarchyKeyByRelatedDocumentVersionKey(contentRecordPage.ContentRecordKey, rootHierarchyKey);
	}

	private static void UpdateContextWithHKey(Page currentPage, Guid hierarchyKey, AppContext context)
	{
		if (context != null)
		{
			context["HKey"] = hierarchyKey;
		}
		if (hierarchyKey == Guid.Empty)
		{
			return;
		}
		ImpersonationInformation val = SecurityContext.Impersonate("MANAGER");
		try
		{
			SiteMapProviderBase siteMapProviderBase = ((HttpContext.Current == null || HttpContext.Current.Items["PreviewMode"] == null || !(bool)HttpContext.Current.Items["PreviewMode"]) ? SiteMapProviderBase.SiteMapProvider : SiteMapProviderBase.PreviewSiteMapProvider);
			if (siteMapProviderBase == null)
			{
				NavigationHierarchyController val2 = NavigationHierarchyController.NewNavigationHierarchyController(context.StatelessBusinessContainer);
				context.SetNavigationKeys((DocumentHierarchy)(object)val2[hierarchyKey]);
			}
			else
			{
				siteMapProviderBase.SetAppContextNavigation(context, hierarchyKey);
			}
			NavigationHierarchy val3 = NavigationHierarchyController.NavigationHierarchy(hierarchyKey, context.StatelessBusinessContainer);
			if (val3 != null && !string.IsNullOrEmpty(val3.OverrideContentTitle))
			{
				currentPage.Title = val3.OverrideContentTitle;
			}
		}
		finally
		{
			((IDisposable)val)?.Dispose();
		}
	}

	private static void VerifyTemplatePath(DisplayPageBase displayPageBase, AppContext context)
	{
		displayPageBase.EnsureWebsite();
		string baseUrl = displayPageBase.GetBaseUrl();
		if (string.IsNullOrEmpty(baseUrl))
		{
			return;
		}
		bool flag = !string.IsNullOrEmpty(context.TemplatePath) && !context.TemplatePath.StartsWith(baseUrl, StringComparison.OrdinalIgnoreCase);
		string text = baseUrl + "/iMIS/ContentManagement/Template.aspx";
		if (string.IsNullOrEmpty(context.TemplatePath) || !text.ToLower(CultureInfo.CurrentCulture).Replace("https:", "http:").Equals(context.TemplatePath.ToLower(CultureInfo.CurrentCulture).Replace("https:", "http:")))
		{
			context.TemplatePath = text;
			if (displayPageBase.mImisWebsite != null)
			{
				context.ResetNavigationKeys(displayPageBase.mImisWebsite.WebsiteKey, displayPageBase.mImisWebsite.PerspectiveKey, displayPageBase.mImisWebsite.RootHierarchyKey, displayPageBase.mImisWebsite.Perspective.PerspectiveName);
			}
			else
			{
				context.ResetNavigationKeys();
			}
		}
		else if (flag)
		{
			context.TemplatePath = text;
		}
	}

	internal static Guid GetHierarchyKey(AppContext context)
	{
		//IL_0190: Unknown result type (might be due to invalid IL or missing references)
		//IL_0197: Expected O, but got Unknown
		//IL_010f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0116: Expected O, but got Unknown
		Guid result = Guid.Empty;
		if (Utilities.GetUrlParamValue("hkey", HttpContext.Current.Request) != null)
		{
			if (Utilities.IsGuid(Utilities.GetUrlParamValue("hkey", HttpContext.Current.Request)))
			{
				result = new Guid(Utilities.GetUrlParamValue("hkey", HttpContext.Current.Request));
			}
		}
		else if (Utilities.GetUrlParamValue("HierarchyKey", HttpContext.Current.Request) != null)
		{
			if (Utilities.IsGuid(Utilities.GetUrlParamValue("HierarchyKey", HttpContext.Current.Request)))
			{
				result = new Guid(Utilities.GetUrlParamValue("HierarchyKey", HttpContext.Current.Request));
			}
		}
		else if (Utilities.GetUrlParamValue("HierarchyCode", HttpContext.Current.Request) != null)
		{
			string urlParamValue = Utilities.GetUrlParamValue("HierarchyCode", HttpContext.Current.Request);
			ImpersonationInformation val = SecurityContext.ImpersonateAnonymous();
			try
			{
				NavigationHierarchyController val2 = NavigationHierarchyController.NewNavigationHierarchyController(StaticBusinessContainer);
				NavigationHierarchy val3 = (NavigationHierarchy)((HierarchyController)val2).GetHierarchyByCode(urlParamValue, true);
				if (val3 != null)
				{
					result = ((Hierarchy)val3).HierarchyKey;
				}
			}
			finally
			{
				((IDisposable)val)?.Dispose();
			}
		}
		else if (Utilities.GetUrlParamValue("NavigationCode", HttpContext.Current.Request) != null)
		{
			string urlParamValue2 = Utilities.GetUrlParamValue("NavigationCode", HttpContext.Current.Request);
			Guid perspectiveAndSetContextGroupProperties = GetPerspectiveAndSetContextGroupProperties(context);
			NavigationHierarchyController val4 = NavigationHierarchyController.NewNavigationHierarchyController(StaticBusinessContainer);
			NavigationHierarchy val5 = (NavigationHierarchy)val4.GetHierarchyByNavigationCode(urlParamValue2, perspectiveAndSetContextGroupProperties, true);
			if (val5 != null)
			{
				result = ((Hierarchy)val5).HierarchyKey;
			}
		}
		return result;
	}

	private static Guid GetPerspectiveAndSetContextGroupProperties(AppContext context)
	{
		Guid guid = context.PerspectiveKey;
		if (HttpContext.Current.Request["PerspectiveKey"] != null)
		{
			guid = new Guid(HttpContext.Current.Request["PerspectiveKey"]);
		}
		if (guid == Guid.Empty)
		{
			UserController val = UserController.NewUserController(StaticBusinessContainer);
			User val2 = val[AppContext.CurrentIdentity.UserKey];
			if (val2 != null)
			{
				guid = val2.DefaultPerspectiveKey;
				context.DepartmentGroupKey = val2.DefaultDepartmentGroupKey;
			}
		}
		if (context.DepartmentGroupKey.Equals(Guid.Empty) && AppContext.CurrentIdentity != null)
		{
			AssignUserDefaultPerspective(context, guid);
		}
		return guid;
	}

	private static void AssignUserDefaultPerspective(AppContext context, Guid perspectiveKey)
	{
		UserController val = UserController.NewUserController(context.StatelessBusinessContainer);
		User val2 = val[AppContext.CurrentIdentity.UserKey];
		if (val2 == null)
		{
			return;
		}
		GroupPerspective[] array = GroupPerspectiveController.DepartmentGroupsByPerspective(perspectiveKey, context.StatelessBusinessContainer);
		GroupPerspective[] array2 = array;
		foreach (GroupPerspective val3 in array2)
		{
			if (val3.IsDefault)
			{
				Group val4 = GroupController.Group(val3.GroupKey, context.StatelessBusinessContainer);
				if (val4.IsGroupMember(val2.UserKey))
				{
					context.DepartmentGroupKey = val4.GroupKey;
					break;
				}
			}
		}
	}

	private static void SetSubjectUniformKeyAndName(AppContext context, string key)
	{
		//IL_0052: Unknown result type (might be due to invalid IL or missing references)
		//IL_0031: Unknown result type (might be due to invalid IL or missing references)
		//IL_0058: Expected O, but got Unknown
		context.SubjectUniformKey = new Guid(key);
		ImpersonationInformation val = SecurityContext.ImpersonateAnonymous();
		Subject val2;
		try
		{
			val2 = ((HttpContext.Current.Request["iObjectName"] != null) ? new Subject(context.SubjectUniformKey, HttpContext.Current.Request["iObjectName"]) : new Subject(context.SubjectUniformKey));
		}
		finally
		{
			((IDisposable)val)?.Dispose();
		}
		try
		{
			context.SubjectName = ((!string.IsNullOrEmpty(val2.Name)) ? val2.Name : ResourceManager.GetPhrase(val2.UniformTypeDesc, val2.UniformTypeDesc));
		}
		catch (ArgumentNullException)
		{
			string phrase = ResourceManager.GetPhrase("NoUniformTypeRef", "No UniformTypeRef record found");
			context.SubjectName = phrase;
		}
	}

	public string GetBaseUrl(bool isSecure)
	{
		EnsureWebsite();
		if ((Utilities.IsStaffSite(this) || Utilities.IsWCMSite(this)) && mImisWebsite != null)
		{
			if (isSecure)
			{
				return mImisWebsite.WebsiteSecureBaseUrl.TrimEnd('/');
			}
			return mImisWebsite.WebsiteBaseUrl.TrimEnd('/');
		}
		if (isSecure)
		{
			return base.Request.Url.GetLeftPart(UriPartial.Authority).TrimEnd('/').Replace("http://", "https://") + Utilities.GetTildeExpansion();
		}
		return base.Request.Url.GetLeftPart(UriPartial.Authority).TrimEnd('/') + Utilities.GetTildeExpansion();
	}

	public string GetBaseUrlIgnoreWebsite(bool isSecure)
	{
		string value = Utilities.GetTildeExpansion().ToLower(CultureInfo.InvariantCulture);
		string text = base.Request.Url.ToString().ToLower(CultureInfo.InvariantCulture);
		string text2 = base.Request.Url.ToString().Substring(0, text.IndexOf(value, StringComparison.OrdinalIgnoreCase)) + Utilities.GetTildeExpansion();
		if (isSecure && !base.Request.IsSecureConnection)
		{
			text2 = text2.Replace("http://", "https://");
		}
		else if (!isSecure && base.Request.IsSecureConnection)
		{
			text2 = text2.Replace("https://", "http://");
		}
		return text2;
	}

	public static IAtom[] ConvertObjectToIAtomArray(object value, DataSourceViewSelectCallback asyncCallback)
	{
		if (value == null)
		{
			return null;
		}
		IAtom val = (IAtom)((value is IAtom) ? value : null);
		if (val != null)
		{
			return (IAtom[])(object)new IAtom[1] { val };
		}
		if (value is IAtom[] result)
		{
			return result;
		}
		if (value is IEnumerable list)
		{
			return ConvertIEnumerableToIAtomArray(list);
		}
		if (value is IListSource listSource)
		{
			return ConvertIEnumerableToIAtomArray(listSource.GetList());
		}
		if (value is IDataSource dataSource && asyncCallback != null)
		{
			ICollection viewNames = dataSource.GetViewNames();
			if (viewNames != null)
			{
				{
					IEnumerator enumerator = viewNames.GetEnumerator();
					try
					{
						if (enumerator.MoveNext())
						{
							string viewName = (string)enumerator.Current;
							DataSourceView view = dataSource.GetView(viewName);
							view.Select(new DataSourceSelectArguments(), asyncCallback);
						}
					}
					finally
					{
						IDisposable disposable = enumerator as IDisposable;
						if (disposable != null)
						{
							disposable.Dispose();
						}
					}
				}
			}
			return null;
		}
		throw new InvalidDataException("The value assigned to the DataSource property must be able to convert to IAtom[]");
	}

	public static IAtom[] ConvertIEnumerableToIAtomArray(IEnumerable list)
	{
		if (list == null)
		{
			return null;
		}
		List<IAtom> list2 = new List<IAtom>();
		foreach (object item in list)
		{
			IAtom val = (IAtom)((item is IAtom) ? item : null);
			if (val != null)
			{
				list2.Add(val);
				continue;
			}
			throw new InvalidDataException("The value assigned to the DataSource property must be able to convert to IAtom[]");
		}
		return list2.ToArray();
	}

	public static void SetPropertyValue(string propertyName, object value, Control control)
	{
		if (control != null)
		{
			ScriptManager.RegisterHiddenField(control, propertyName, SerializePropertyValue(value));
		}
	}

	public static void SetPropertyValue(string propertyName, object value, Page page)
	{
		if (page != null)
		{
			ScriptManager.RegisterHiddenField(page, propertyName, SerializePropertyValue(value));
		}
	}

	public static void SetPropertyValue(string propertyName, object value, StateBag viewState)
	{
		if (viewState != null)
		{
			viewState[propertyName] = value;
		}
	}

	public static object GetPropertyValue(string propertyName, StateBag viewState)
	{
		return GetPropertyValue(propertyName, viewState, null);
	}

	public static object GetPropertyValue(string propertyName, StateBag viewState, object defaultValue)
	{
		if (viewState != null)
		{
			return viewState[propertyName] ?? defaultValue;
		}
		return defaultValue;
	}

	public static object GetPropertyValue(string propertyName, HttpRequest request)
	{
		return GetPropertyValue(propertyName, request, null);
	}

	public static object GetPropertyValue(string propertyName, HttpRequest request, object defaultValue)
	{
		if (request != null && request.Form[propertyName] != null)
		{
			return DeserializePropertyValue(request.Form[propertyName]);
		}
		return defaultValue;
	}

	internal static string SerializePropertyValue(object value)
	{
		string s = JsonConvert.SerializeObject(value, GlobalSettings.ExternalJsonSerializerSettings);
		return Convert.ToBase64String(Encoding.UTF8.GetBytes(s));
	}

	internal static object DeserializePropertyValue(string serializedValue)
	{
		string text = Encoding.UTF8.GetString(Convert.FromBase64String(serializedValue));
		object obj = JsonConvert.DeserializeObject(text, GlobalSettings.ExternalJsonSerializerSettings);
		if (obj is object[] array)
		{
			obj = Array.ConvertAll(array, RestoreTypeFidelity);
		}
		return obj;
	}

	private static object RestoreTypeFidelity(object element)
	{
		if (element is string input && Guid.TryParse(input, out var result))
		{
			return result;
		}
		return element;
	}

	[WebMethod]
	public static string GetActionLink(PageOperation action, TemplateType templateType, string docType, Guid hierarchyKey, Guid documentVersionKey, Guid folderHierarchyKey, int itemCount, bool closeWindowOnCommit, Guid websiteKey, Guid pageInstanceKey)
	{
		return ObjectBrowserHelper.GetActionLink(action, templateType, docType, hierarchyKey, documentVersionKey, folderHierarchyKey, itemCount, closeWindowOnCommit, websiteKey, pageInstanceKey);
	}

	[WebMethod]
	public static WindowProperties GetWindowProperties(PageOperation action, TemplateType templateType, string docType, Guid hierarchyKey, Guid documentVersionKey, Guid folderHierarchyKey, int itemCount, bool closeWindowOnCommit, Guid websiteKey, Guid pageInstanceKey)
	{
		return ObjectBrowserHelper.GetWindowProperties(action, templateType, docType, hierarchyKey, documentVersionKey, folderHierarchyKey, itemCount, closeWindowOnCommit, websiteKey, pageInstanceKey);
	}

	[WebMethod]
	[ScriptMethod]
	public static string[] GetAddressCompletionList(string prefixText)
	{
		return ObjectBrowserHelper.GetAddressCompletionList(prefixText);
	}

	[WebMethod]
	[ScriptMethod]
	public static bool CheckForPasteConflict(string selectedKeys, Guid targetHierarchyKey)
	{
		if (selectedKeys == null)
		{
			throw new ArgumentNullException("selectedKeys");
		}
		return ObjectBrowserHelper.CheckForPasteConflict(selectedKeys.Split(new char[1] { ',' }, StringSplitOptions.RemoveEmptyEntries), targetHierarchyKey);
	}
}
