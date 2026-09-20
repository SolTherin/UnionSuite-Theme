using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using Asi.Business;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Security.Utility;
using Asi.Soa.Core.ServiceContracts;
using Asi.Web.UI;
using Asi.Web.UI.WebControls;
using Asi.Web.iParts.Common.ContentCollectionOrganizer.Common;
using Autofac.Integration.Web.Forms;
using Telerik.Web.UI;

namespace Asi.Web.iParts.Common.ContentCollectionOrganizer;

[InjectProperties]
public class ContentCollectionOrganizerDisplay : iPartDisplayBase
{
	private ContentCollectionOrganizerCommon item;

	private bool isBound;

	private bool refreshExisting;

	private iPartDisplayBase refreshingPart;

	private RadAjaxPanel refreshingPanel;

	private bool isStaffUser;

	private const string partyIdSessionKey = "Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.PartyId";

	private const string contactKeySessionKey = "Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.ContactKey";

	private string createdPartyId;

	protected Literal TabPanelAnchor;

	protected Label InfoControl;

	protected Label MoreInfoControl;

	protected Panel MainContentControl;

	protected RadTabStrip radTab_Top;

	protected RadMultiPage radPage;

	protected RadTabStrip radTab_Bottom;

	protected UpdatePanel updatePanel;

	protected Button refreshTrigger;

	protected Panel panStep;

	protected Label debug;

	public string PageTitle
	{
		get
		{
			return ((iPartDisplayBase)this).PartTitle;
		}
		set
		{
			((iPartDisplayBase)this).PartTitle = value;
		}
	}

	public IDocumentService DocumentService { get; set; }

	[ExcludeFromCodeCoverage]
	public DisplayStyle DisplayStyle
	{
		get
		{
			if (((Control)(object)this).ViewState["DisplayStyle"] == null)
			{
				return DisplayStyle.HTop;
			}
			return (DisplayStyle)((Control)(object)this).ViewState["DisplayStyle"];
		}
		set
		{
			((Control)(object)this).ViewState["DisplayStyle"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public bool WizardMode
	{
		get
		{
			if (((Control)(object)this).ViewState["WizardMode"] == null)
			{
				return false;
			}
			return (bool)((Control)(object)this).ViewState["WizardMode"];
		}
		set
		{
			((Control)(object)this).ViewState["WizardMode"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public bool UseContentFolder
	{
		get
		{
			if (((Control)(object)this).ViewState["UseContentFolder"] == null)
			{
				return false;
			}
			return (bool)((Control)(object)this).ViewState["UseContentFolder"];
		}
		set
		{
			((Control)(object)this).ViewState["UseContentFolder"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public string ContentFolder
	{
		get
		{
			if (((Control)(object)this).ViewState["ContentFolder"] == null)
			{
				return string.Empty;
			}
			return (string)((Control)(object)this).ViewState["ContentFolder"];
		}
		set
		{
			((Control)(object)this).ViewState["ContentFolder"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public Guid ContentFolderKey
	{
		get
		{
			if (((Control)(object)this).ViewState["ContentFolderKey"] == null)
			{
				return Guid.Empty;
			}
			return (Guid)((Control)(object)this).ViewState["ContentFolderKey"];
		}
		set
		{
			((Control)(object)this).ViewState["ContentFolderKey"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public bool SequentialSteps
	{
		get
		{
			if (((Control)(object)this).ViewState["SequentialSteps"] == null)
			{
				return false;
			}
			return (bool)((Control)(object)this).ViewState["SequentialSteps"];
		}
		set
		{
			((Control)(object)this).ViewState["SequentialSteps"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public string TabbedDialogSettings
	{
		get
		{
			if (((Control)(object)this).ViewState["TabbedDialogSettings"] == null)
			{
				return string.Empty;
			}
			if (UseContentFolder)
			{
				return CommonCode.GenerateDynamicTabSettings(ContentFolderKey, Guid.Empty, DocumentService);
			}
			return (string)((Control)(object)this).ViewState["TabbedDialogSettings"];
		}
		set
		{
			((Control)(object)this).ViewState["TabbedDialogSettings"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public string URLKeyName
	{
		get
		{
			if (((Control)(object)this).ViewState["URLKeyName"] == null)
			{
				return string.Empty;
			}
			return (string)((Control)(object)this).ViewState["URLKeyName"];
		}
		set
		{
			((Control)(object)this).ViewState["URLKeyName"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	private List<int> StepsCompletedbyWorkflow
	{
		get
		{
			if (((UserControl)this).Session[((Control)(object)this).ClientID + "_WorkFlow_CompleteSteps"] == null)
			{
				((UserControl)this).Session[((Control)(object)this).ClientID + "_WorkFlow_CompleteSteps"] = new List<int>();
			}
			return (List<int>)((UserControl)this).Session[((Control)(object)this).ClientID + "_WorkFlow_CompleteSteps"];
		}
		set
		{
			((UserControl)this).Session[((Control)(object)this).ClientID + "_WorkFlow_CompleteSteps"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	private string CurrentTabIndex
	{
		get
		{
			if (((UserControl)this).Session[((Control)(object)this).ClientID + "_CurrentStepIndex"] == null)
			{
				return string.Empty;
			}
			return (string)((UserControl)this).Session[((Control)(object)this).ClientID + "_CurrentStepIndex"];
		}
		set
		{
			((UserControl)this).Session[((Control)(object)this).ClientID + "_CurrentStepIndex"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public bool IncludeIdAsQuerystringParameter
	{
		get
		{
			if (((Control)(object)this).ViewState["IncludeIdAsQuerystringParameter"] == null)
			{
				return false;
			}
			return (bool)((Control)(object)this).ViewState["IncludeIdAsQuerystringParameter"];
		}
		set
		{
			((Control)(object)this).ViewState["IncludeIdAsQuerystringParameter"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public string UrlRedirect
	{
		get
		{
			if (((Control)(object)this).ViewState["UrlRedirect"] == null)
			{
				return string.Empty;
			}
			return (string)((Control)(object)this).ViewState["UrlRedirect"];
		}
		set
		{
			((Control)(object)this).ViewState["UrlRedirect"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public string RedirectLocation
	{
		get
		{
			return (((Control)(object)this).ViewState["RedirectLocation"] != null) ? ((string)((Control)(object)this).ViewState["RedirectLocation"]) : RedirectTo.DoNotRedirect.ToString();
		}
		set
		{
			((Control)(object)this).ViewState["RedirectLocation"] = value;
		}
	}

	public bool IsPopup => (((UserControl)this).Request["IsPopup"] != null) ? bool.Parse(((UserControl)this).Request["IsPopup"]) : ((DisplayPageBase)((Control)(object)this).Page).IsPopup;

	public override ContentItem CreateContentItem()
	{
		ContentCollectionOrganizerCommon contentCollectionOrganizerCommon = new ContentCollectionOrganizerCommon();
		((ContentItem)contentCollectionOrganizerCommon).ContentItemKey = ((ContentItemDisplayBase)this).ContentItemKey;
		item = contentCollectionOrganizerCommon;
		((ContentItem)item).Modified += ItemModifiedHandler;
		return (ContentItem)(object)item;
	}

	private void ItemModifiedHandler(object sender, EventArgs e)
	{
		if (item.WizardMode)
		{
			if (!string.IsNullOrEmpty(item.URLKeyName))
			{
				URLKeyName = item.URLKeyName;
			}
		}
		else
		{
			URLKeyName = item.URLKeyName;
		}
	}

	protected override void CreateChildControls()
	{
		//IL_0243: Unknown result type (might be due to invalid IL or missing references)
		//IL_024a: Expected O, but got Unknown
		((ContentItemDisplayBase)this).CreateChildControls();
		if (!((UserControl)this).IsPostBack)
		{
			((UserControl)this).Session["Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.PartyId"] = null;
			((UserControl)this).Session["Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.ContactKey"] = null;
		}
		if (((iPartDisplayBase)this).DoNotRenderInDesignMode && ((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			InfoControl.Visible = true;
			InfoControl.Text = ResourceManager.GetPhrase("Asi.Web.iParts.iPartNotDisplayed", "This dynamic content item is hidden in design mode.");
			return;
		}
		RefreshForm();
		if (WizardMode && !((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			return;
		}
		RadTabStrip radTab = (((Control)(object)radTab_Top).Visible ? radTab_Top : radTab_Bottom);
		if (((ContentItemDisplayBase)this).IsContentDesignMode || string.IsNullOrEmpty(TabbedDialogSettings))
		{
			return;
		}
		CommonCode commonCode = new CommonCode();
		List<TabbedDialogItem> list = CommonCode.DeserializeSettings(TabbedDialogSettings, DocumentService, commonCode.ItemListSep, commonCode.ItemValuesSep, includeWorkingContent: false, isStaffUser);
		if (list == null || list.Count == 0)
		{
			((Control)(object)this).Visible = false;
			return;
		}
		TabbedDialogItem tabItemByIndexOrName = CommonCode.GetTabItemByIndexOrName(CurrentTabIndex, list, honorDefault: true);
		CheckForUrlParameters(tabItemByIndexOrName);
		if (((Control)(object)this).FindControl("Pan_Page_" + tabItemByIndexOrName.Index) != null && ValidateContentPath(tabItemByIndexOrName.ContentItemPath))
		{
			PlaceHolder placeHolder = (PlaceHolder)((Control)(object)this).FindControl("Pan_Page_" + tabItemByIndexOrName.Index);
			placeHolder.Controls.Clear();
			if (tabItemByIndexOrName.ContentItemKey != Guid.Empty)
			{
				CommonCode.RenderContentRecordDisplay(tabItemByIndexOrName.ContentItemKey, placeHolder, ((UserControlBase)this).StatefulBusinessContainer, ((Control)(object)this).Page);
			}
			foreach (IUserControl item in placeHolder.Controls.OfType<Panel>().SelectMany((Panel panel) => panel.Controls.OfType<IUserControl>()))
			{
				((UserControlBase)this).AddChildUserControl(item);
				iPartDisplayBase val = (iPartDisplayBase)(object)((item is iPartDisplayBase) ? item : null);
				if (val == null)
				{
					continue;
				}
				object obj = (object)new RadAjaxPanel();
				if (((UserControlBase)val).GetObjectProviderData() != null && ((UserControlBase)val).GetObjectProviderData().GetType() == obj.GetType())
				{
					object objectProviderData = ((UserControlBase)val).GetObjectProviderData();
					RadAjaxPanel val2 = (RadAjaxPanel)((objectProviderData is RadAjaxPanel) ? objectProviderData : null);
					if (val2 != null && ((RadAjaxControl)val2).IsAjaxRequest)
					{
						refreshingPart = val;
						refreshingPanel = val2;
						refreshExisting = true;
					}
				}
			}
			SelectTab(radTab, tabItemByIndexOrName);
		}
		if (((Control)(object)this).FindControl("Pan_Page_" + tabItemByIndexOrName.Index) != null && !ValidateContentPath(tabItemByIndexOrName.ContentItemPath))
		{
			SelectTabForMissingContent(radTab, tabItemByIndexOrName);
		}
	}

	private void SelectTab(RadTabStrip radTab, TabbedDialogItem currentItem)
	{
		//IL_0016: Unknown result type (might be due to invalid IL or missing references)
		//IL_001c: Expected O, but got Unknown
		foreach (RadTab item in (StateManagedCollection)(object)radTab.Tabs)
		{
			RadTab val = item;
			if (((ControlItem)val).Value == currentItem.Index.ToString(CultureInfo.InvariantCulture))
			{
				val.Selected = true;
				val.PageView.Selected = true;
				((ContentItemDisplayBase)this).DynamicContentPageTitle = ((ControlItem)val).Text;
				break;
			}
		}
	}

	private void SelectTabForMissingContent(RadTabStrip radTab, TabbedDialogItem currentItem)
	{
		//IL_0016: Unknown result type (might be due to invalid IL or missing references)
		//IL_001c: Expected O, but got Unknown
		foreach (RadTab item in (StateManagedCollection)(object)radTab.Tabs)
		{
			RadTab val = item;
			if (((ControlItem)val).Value != currentItem.Index.ToString(CultureInfo.InvariantCulture))
			{
				continue;
			}
			val.Selected = true;
			val.PageView.Selected = true;
			((ContentItemDisplayBase)this).DynamicContentPageTitle = ((ControlItem)val).Text;
			break;
		}
	}

	private static bool ValidateContentPath(string contentPath)
	{
		if (contentPath != null && contentPath.StartsWith("@", StringComparison.CurrentCulture))
		{
			Guid guid = DocumentSystem.DocumentKeyByPath(contentPath);
			return guid != Guid.Empty;
		}
		return false;
	}

	[ExcludeFromCodeCoverage]
	protected override void OnLoad(EventArgs e)
	{
		((iPartDisplayBase)this).OnLoad(e);
		((Control)(object)this).EnsureChildControls();
		RefreshForm();
		RefreshPageView();
		DesignModeRefreshPageView();
		if (!string.IsNullOrEmpty(URLKeyName) && !((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			TabPanelAnchor.Visible = true;
			TabPanelAnchor.Text = string.Format(CultureInfo.InvariantCulture, "<a name=\"{0}\"></a>", URLKeyName);
		}
	}

	[ExcludeFromCodeCoverage]
	public override void DataBind()
	{
		if (!isBound)
		{
			RefreshForm();
			((Control)this).DataBind();
			isBound = true;
		}
	}

	[ExcludeFromCodeCoverage]
	public void NextPreviousButton_Click(object sender, EventArgs e)
	{
		string iD = ((Button)sender).ID;
		string text = string.Empty;
		int step = 0;
		List<TabbedDialogItem> list = null;
		TabbedDialogItem currentStep = new TabbedDialogItem();
		CommonCode commonCode = new CommonCode();
		if (!string.IsNullOrEmpty(TabbedDialogSettings))
		{
			list = CommonCode.DeserializeSettings(TabbedDialogSettings, DocumentService, commonCode.ItemListSep, commonCode.ItemValuesSep, ((ContentItemDisplayBase)this).IsContentDesignMode, isStaffUser);
		}
		string[] array = iD.Split('_');
		if (array.Length == 2)
		{
			text = array[0];
			if (!int.TryParse(array[1], out step))
			{
				step = 0;
			}
		}
		if (string.IsNullOrEmpty(text) || step == 0 || list == null)
		{
			return;
		}
		using (IEnumerator<TabbedDialogItem> enumerator = list.Where((TabbedDialogItem tmp) => tmp.Index == step).GetEnumerator())
		{
			if (enumerator.MoveNext())
			{
				TabbedDialogItem current = enumerator.Current;
				currentStep = current;
			}
		}
		if (text == "btnNext")
		{
			ProcessNextAction(currentStep, step, list);
		}
		else
		{
			ProcessPreviousAction(step, list);
		}
	}

	[ExcludeFromCodeCoverage]
	public void Tab_TabClick(object sender, RadTabStripEventArgs e)
	{
		if (e == null)
		{
			throw new ArgumentNullException("e");
		}
		CurrentTabIndex = ((ControlItem)e.Tab).Value;
		string text = CommonCode.BuildNewUrl(((UserControl)this).Request.Url.AbsolutePath, ((UserControl)this).Request.Url.Query, ((ControlItem)e.Tab).Value, URLKeyName);
		if (!string.IsNullOrEmpty(URLKeyName) && !((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			text = string.Format(CultureInfo.InvariantCulture, "{0}#{1}", text, URLKeyName);
		}
		if (text.Contains("OrderLineId="))
		{
			text = RemoveQueryStringByKey(text, "OrderLineId");
		}
		((UserControl)this).Response.Redirect(text);
	}

	[ExcludeFromCodeCoverage]
	private static string RemoveQueryStringByKey(string url, string key)
	{
		string result = string.Empty;
		int num = url.IndexOf(key, StringComparison.Ordinal);
		if (num > -1)
		{
			string text = string.Empty;
			int num2 = url.IndexOf('&', num);
			if (num2 != -1)
			{
				text = url.Substring(num2, url.Length - num2);
			}
			num--;
			result = url.Substring(0, num) + text;
		}
		return result;
	}

	[ExcludeFromCodeCoverage]
	public void RefreshPageView()
	{
		if (refreshExisting && ((UserControl)this).IsPostBack && !((ContentItemDisplayBase)this).IsContentDesignMode && refreshingPanel != null && !((Control)(object)refreshingPart).ID.Contains("Panel"))
		{
			((RadAjaxControl)refreshingPanel).ResponseScripts.Add(string.Format(CultureInfo.InvariantCulture, "__doPostBack('{0}', '');", refreshTrigger.ClientID));
		}
	}

	[ExcludeFromCodeCoverage]
	public void DesignModeRefreshPageView()
	{
		if (!((UserControl)this).IsPostBack && ((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			string script = "function CallbackRefresh(){ document.location.reload(); }";
			ScriptManager.RegisterClientScriptBlock(((Control)(object)this).Page, ((object)this).GetType(), "CallbackRefresh()", script, addScriptTags: true);
		}
	}

	[ExcludeFromCodeCoverage]
	protected void RefreshTriggerClick(object sender, EventArgs e)
	{
		refreshExisting = false;
		refreshingPanel = null;
		refreshingPart = null;
		updatePanel.Update();
	}

	[ExcludeFromCodeCoverage]
	protected override void OnPreRender(EventArgs e)
	{
		//IL_003a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0040: Expected O, but got Unknown
		((iPartDisplayBase)this).OnPreRender(e);
		RadTabStrip val = (((Control)(object)radTab_Top).Visible ? radTab_Top : radTab_Bottom);
		foreach (RadTab item in (StateManagedCollection)(object)val.Tabs)
		{
			RadTab val2 = item;
			if (((WebControl)(object)val2).Attributes["translate"] == null)
			{
				((WebControl)(object)val2).Attributes.Add("translate", "yes");
			}
		}
		if (!((ContentItemDisplayBase)this).IsContentDesignMode && !string.IsNullOrEmpty(TabbedDialogSettings) && WizardMode)
		{
			string currentTabIndex = CurrentTabIndex;
			CommonCode commonCode = new CommonCode();
			List<TabbedDialogItem> list = CommonCode.DeserializeSettings(TabbedDialogSettings, DocumentService, commonCode.ItemListSep, commonCode.ItemValuesSep, includeWorkingContent: false, isStaffUser);
			if (list != null)
			{
				TabbedDialogItem tabItemByIndexOrName = CommonCode.GetTabItemByIndexOrName(currentTabIndex, list, honorDefault: false);
				if (tabItemByIndexOrName.IsHidden && ((Control)(object)this).FindControl("btnNext_" + tabItemByIndexOrName.Index) != null)
				{
					NextPreviousButton_Click(((Control)(object)this).FindControl("btnNext_" + tabItemByIndexOrName.Index), null);
				}
			}
		}
		GetChildCommandButtons();
	}

	[ExcludeFromCodeCoverage]
	private void RefreshForm()
	{
		bool isContentDesignMode = ((ContentItemDisplayBase)this).IsContentDesignMode;
		isStaffUser = AppContext.CurrentPrincipal.IsInRole("SysAdmin") || AppContext.CurrentPrincipal.IsInRole("IsStaff") || AppContext.CurrentPrincipal.IsInRole("full staff");
		if (((iPartDisplayBase)this).DoNotRenderInDesignMode && ((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			InfoControl.Visible = true;
			InfoControl.Text = ResourceManager.GetPhrase("Asi.Web.iParts.iPartNotDisplayed", "This dynamic content item is hidden in design mode.");
			return;
		}
		if (!isContentDesignMode)
		{
			if (WizardMode)
			{
				if (string.IsNullOrEmpty(URLKeyName))
				{
					URLKeyName = Guid.NewGuid().ToString().Replace("-", "_");
				}
			}
			else if (item != null)
			{
				URLKeyName = ((ContentItem)item).ContentItemName;
			}
		}
		if (WizardMode)
		{
			if (string.IsNullOrEmpty(((UserControl)this).Request[URLKeyName]))
			{
				CurrentTabIndex = null;
			}
			else if (string.IsNullOrEmpty(CurrentTabIndex) && !string.IsNullOrEmpty(((UserControl)this).Request["OrderLineId"]))
			{
				CurrentTabIndex = ((UserControl)this).Request.QueryString[URLKeyName];
			}
		}
		else
		{
			CurrentTabIndex = ((UserControl)this).Request.QueryString[URLKeyName];
		}
		MoreInfoControl.Visible = isContentDesignMode;
		if (isContentDesignMode)
		{
			MoreInfoControl.Text = (WizardMode ? ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.WizardModeMessage", "This dynamic content item will run in wizard mode.") : ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NonWizardModeMessage", "This dynamic content item will run as a tabbed dialog."));
		}
		InfoControl.Visible = isContentDesignMode;
		ConfigTabbedDialog(isContentDesignMode);
	}

	[ExcludeFromCodeCoverage]
	private void ConfigTabbedDialog(bool designMode)
	{
		//IL_0343: Unknown result type (might be due to invalid IL or missing references)
		//IL_034d: Expected O, but got Unknown
		//IL_0368: Unknown result type (might be due to invalid IL or missing references)
		//IL_0372: Expected O, but got Unknown
		CommonCode commonCode = new CommonCode();
		radTab_Top.ShowBaseLine = true;
		radTab_Bottom.ShowBaseLine = true;
		if (WizardMode && designMode && (bool)CommonCode.GetEnumValueByType(DisplayStyle, typeof(NotTabsAttribute)))
		{
			((Control)(object)radTab_Bottom).Visible = false;
			((Control)(object)radTab_Top).Visible = true;
			((Control)(object)radPage).Visible = true;
			panStep.Visible = false;
			radTab_Top.Orientation = (TabStripOrientation)0;
			((WebControl)(object)radPage).Style.Add("float", "none");
			((WebControl)(object)radTab_Top).Style.Add("float", "none");
			InfoControl.CssClass = "Info";
			InfoControl.Visible = true;
			InfoControl.Text = ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.WorkFlowWithoutTabs", "You have selected a workflow layout that does not include tabs. These tabs are displayed for convenience. The actual workflow will not display any tabs.<br/>");
		}
		else if (DisplayStyle == DisplayStyle.HBottom)
		{
			((Control)(object)radTab_Bottom).Visible = true;
			((Control)(object)radTab_Top).Visible = false;
			radTab_Bottom.Orientation = (TabStripOrientation)1;
			((WebControl)(object)radPage).Style.Add("float", "none");
		}
		else if (DisplayStyle == DisplayStyle.VLeft)
		{
			((Control)(object)radTab_Bottom).Visible = false;
			((Control)(object)radTab_Top).Visible = true;
			radTab_Top.Orientation = (TabStripOrientation)3;
			((WebControl)(object)radPage).Style.Add("float", "left");
			((WebControl)(object)radTab_Top).Style.Add("float", "left");
			((WebControl)(object)radPage).Style.Add("margin-left", "2px;");
		}
		else if (DisplayStyle == DisplayStyle.VRight)
		{
			((Control)(object)radTab_Bottom).Visible = false;
			((Control)(object)radTab_Top).Visible = true;
			radTab_Top.Orientation = (TabStripOrientation)2;
			((WebControl)(object)radPage).Style.Add("float", "left");
			((WebControl)(object)radTab_Top).Style.Add("float", "right");
			((WebControl)(object)radPage).Style.Add("margin-right", "-1px;");
		}
		else
		{
			((Control)(object)radTab_Bottom).Visible = false;
			((Control)(object)radTab_Top).Visible = true;
			radTab_Top.Orientation = (TabStripOrientation)0;
			((WebControl)(object)radPage).Style.Add("float", "none");
			((WebControl)(object)radTab_Top).Style.Add("float", "none");
		}
		if (designMode)
		{
			radPage.RenderSelectedPageOnly = false;
			radTab_Top.AutoPostBack = false;
			radTab_Bottom.AutoPostBack = false;
		}
		else
		{
			radPage.RenderSelectedPageOnly = false;
			radTab_Bottom.AutoPostBack = false;
			radTab_Top.AutoPostBack = true;
			radTab_Top.TabClick += new RadTabStripEventHandler(Tab_TabClick);
			radTab_Bottom.AutoPostBack = true;
			radTab_Bottom.TabClick += new RadTabStripEventHandler(Tab_TabClick);
			if (updatePanel.Triggers.Count > 0)
			{
				updatePanel.Triggers.Clear();
			}
			updatePanel.Triggers.Add(new AsyncPostBackTrigger
			{
				ControlID = ((Control)(object)radTab_Top).ID,
				EventName = "TabClick"
			});
			updatePanel.Triggers.Add(new AsyncPostBackTrigger
			{
				ControlID = ((Control)(object)radTab_Bottom).ID,
				EventName = "TabClick"
			});
		}
		List<TabbedDialogItem> list = null;
		if (TabbedDialogSettings != null)
		{
			list = CommonCode.DeserializeSettings(TabbedDialogSettings, DocumentService, commonCode.ItemListSep, commonCode.ItemValuesSep, ((ContentItemDisplayBase)this).IsContentDesignMode, isStaffUser);
		}
		if (list == null || list.Count == 0)
		{
			((Control)(object)radTab_Bottom).Visible = false;
			((Control)(object)radTab_Top).Visible = false;
			((Control)(object)radPage).Visible = false;
			InfoControl.Visible = true;
			InfoControl.Text = ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NoTabs", "This dynamic content item is not configured.");
			MoreInfoControl.Visible = false;
			return;
		}
		((Control)(object)radPage).Visible = true;
		if (string.IsNullOrEmpty(MoreInfoControl.Text))
		{
			MoreInfoControl.Visible = false;
		}
		InfoControl.Visible = false;
		if ((!WizardMode || (WizardMode && designMode)) && !UseContentFolder)
		{
			DisplayTabs(designMode, list, ((Control)(object)radTab_Top).Visible ? radTab_Top : radTab_Bottom, radPage, WizardMode, SequentialSteps);
		}
		else if (UseContentFolder)
		{
			DisplayTabs(designMode, list, ((Control)(object)radTab_Top).Visible ? radTab_Top : radTab_Bottom, radPage, wizardMode: false, sequentialSteps: false);
		}
		else if (WizardMode && !designMode)
		{
			RenderWorkFlowStep();
		}
	}

	private void ProcessNextAction(TabbedDialogItem currentStep, int step, List<TabbedDialogItem> currentSettings)
	{
		bool flag = ValidateWorkFlowStep(currentStep);
		if (CommonCode.GetCurrentStepPosition(step.ToString(CultureInfo.InvariantCulture), currentSettings, needFirst: false))
		{
			if (flag)
			{
				RedirectToSpecifiedLocation();
			}
		}
		else if (SequentialSteps)
		{
			if (!flag && !currentStep.IsHidden)
			{
				return;
			}
			int num = 0;
			bool flag2 = false;
			foreach (TabbedDialogItem currentSetting in currentSettings)
			{
				if (flag2)
				{
					num = currentSetting.Index;
					break;
				}
				if (currentSetting.Index == step)
				{
					flag2 = true;
				}
			}
			if (num == 0)
			{
				if (!currentStep.IsHidden)
				{
					num = step;
				}
				else if (currentStep.IsHidden)
				{
					num = step - 1;
				}
			}
			RedirectToNextStep(num);
		}
		else if (flag)
		{
			if (!currentStep.IsHidden)
			{
				List<int> stepsCompletedbyWorkflow = StepsCompletedbyWorkflow;
				stepsCompletedbyWorkflow.Add(currentStep.Index);
				StepsCompletedbyWorkflow = stepsCompletedbyWorkflow;
			}
			int num;
			if (currentStep.OnSuccess == 0)
			{
				num = 0;
				bool flag2 = false;
				foreach (TabbedDialogItem currentSetting2 in currentSettings)
				{
					if (flag2)
					{
						num = currentSetting2.Index;
						break;
					}
					if (currentSetting2.Index == currentStep.Index)
					{
						flag2 = true;
					}
				}
				if (num == 0)
				{
					num = currentStep.Index;
				}
			}
			else
			{
				num = currentStep.OnSuccess;
			}
			RedirectToNextStep(num);
		}
		else if (currentStep.OnFail != currentStep.Index)
		{
			int num = currentStep.OnFail;
			RedirectToNextStep(num);
		}
	}

	[ExcludeFromCodeCoverage]
	private void RedirectToNextStep(int nextStep)
	{
		string text = CommonCode.BuildNewUrl(((UserControl)this).Request.Url.AbsolutePath, GetQueryValues(((UserControl)this).Request.Url.Query, createdPartyId, IncludeIdAsQuerystringParameter), nextStep.ToString(CultureInfo.InvariantCulture), URLKeyName);
		if (!string.IsNullOrEmpty(URLKeyName) && !((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			text = string.Format(CultureInfo.InvariantCulture, "{0}#{1}", text, URLKeyName);
		}
		CurrentTabIndex = nextStep.ToString(CultureInfo.InvariantCulture);
		((UserControl)this).Response.Redirect(text, endResponse: false);
	}

	private static string GetQueryValues(string urlQuery, string partyId, bool includeId)
	{
		string text = urlQuery;
		if (!string.IsNullOrEmpty(partyId) && includeId)
		{
			string imisIdUrlParameterName = SecurityHelper.GetImisIdUrlParameterName();
			if (text.Contains(imisIdUrlParameterName))
			{
				string pattern = string.Format(CultureInfo.InvariantCulture, "{0}=[a-zA-Z0-9\\-]*", imisIdUrlParameterName);
				text = Regex.Replace(text, pattern, string.Format(CultureInfo.InvariantCulture, "{0}={1}", imisIdUrlParameterName, partyId));
			}
			else
			{
				text = string.Format(CultureInfo.InvariantCulture, "?{0}={1}&{2}", imisIdUrlParameterName, partyId, text.TrimStart('?'));
			}
		}
		return text;
	}

	private void ProcessPreviousAction(int step, List<TabbedDialogItem> currentSettings)
	{
		int num;
		if (SequentialSteps || (WizardMode && !SequentialSteps))
		{
			num = step;
			if (step >= 2)
			{
				for (int num2 = step - 2; num2 >= 0; num2--)
				{
					if (!currentSettings[num2].IsHidden)
					{
						num = currentSettings[num2].Index;
						break;
					}
				}
			}
			if (num != step)
			{
				string text = CommonCode.BuildNewUrl(((UserControl)this).Request.Url.AbsolutePath, ((UserControl)this).Request.Url.Query, num.ToString(CultureInfo.InvariantCulture), URLKeyName);
				if (!string.IsNullOrEmpty(URLKeyName) && !((ContentItemDisplayBase)this).IsContentDesignMode)
				{
					text = string.Format(CultureInfo.InvariantCulture, "{0}#{1}", text, URLKeyName);
				}
				CurrentTabIndex = num.ToString(CultureInfo.InvariantCulture);
				((UserControl)this).Response.Redirect(text);
			}
			return;
		}
		if (StepsCompletedbyWorkflow.Count == 0)
		{
			num = 1;
		}
		else
		{
			List<int> stepsCompletedbyWorkflow = StepsCompletedbyWorkflow;
			num = stepsCompletedbyWorkflow[stepsCompletedbyWorkflow.Count - 1];
			stepsCompletedbyWorkflow.Remove(stepsCompletedbyWorkflow[stepsCompletedbyWorkflow.Count - 1]);
			if (stepsCompletedbyWorkflow.Count == 0)
			{
				StepsCompletedbyWorkflow.Clear();
			}
			else
			{
				StepsCompletedbyWorkflow = stepsCompletedbyWorkflow;
			}
		}
		if (num != step)
		{
			string text = CommonCode.BuildNewUrl(((UserControl)this).Request.Url.AbsolutePath, ((UserControl)this).Request.Url.Query, num.ToString(CultureInfo.InvariantCulture), URLKeyName);
			if (!string.IsNullOrEmpty(URLKeyName) && !((ContentItemDisplayBase)this).IsContentDesignMode)
			{
				text = string.Format(CultureInfo.InvariantCulture, "{0}#{1}", text, URLKeyName);
			}
			CurrentTabIndex = num.ToString(CultureInfo.InvariantCulture);
			((UserControl)this).Response.Redirect(text);
		}
	}

	private void RedirectToSpecifiedLocation()
	{
		if (RedirectLocation.Equals(RedirectTo.ContentOrUrl.ToString()))
		{
			if (!string.IsNullOrWhiteSpace(UrlRedirect))
			{
				string text = Utilities.GetRedirectPath(UrlRedirect, ((UserControl)this).Request.IsSecureConnection).ToString();
				text = Utilities.AppendToQueryString(text, "WebsiteKey", (object)((UserControlBase)this).CurrentContext.WebsiteKey.ToString());
				if (IncludeIdAsQuerystringParameter)
				{
					string imisIdUrlParameterName = SecurityHelper.GetImisIdUrlParameterName();
					text = Utilities.AppendToQueryString(text, imisIdUrlParameterName, (object)SecurityHelper.GetSelectedImisId(((UserControl)this).Request));
				}
				if (text.IndexOf("ID=LoggedInUserId", StringComparison.OrdinalIgnoreCase) > 0 || text.IndexOf("ContactKey=LoggedInUserId", StringComparison.OrdinalIgnoreCase) > 0)
				{
					text = Regex.Replace(text, "LoggedInUserId", SecurityHelper.GetSelectedImisId());
				}
				((UserControl)this).Response.Redirect(text);
			}
		}
		else if (!IsPopup)
		{
			((UserControl)this).Response.Redirect(((UserControl)this).Request.RawUrl);
		}
		else
		{
			ScriptManager.RegisterStartupScript(((Control)(object)this).Page, ((object)this).GetType(), "ClosePopup_" + ((Control)(object)this).ClientID, "CloseRadWindow();", addScriptTags: true);
		}
	}

	private void CheckForUrlParameters(TabbedDialogItem currentItem)
	{
		if (string.IsNullOrEmpty(currentItem.UrlParameters))
		{
			return;
		}
		string query = ((UserControl)this).Request.Url.Query;
		if (!query.Contains(currentItem.UrlParameters))
		{
			query = string.Format(CultureInfo.InvariantCulture, "?{0}&{1}", currentItem.UrlParameters, query.TrimStart('?'));
			string text = CommonCode.BuildNewUrl(((UserControl)this).Request.Url.AbsolutePath, query, CurrentTabIndex, URLKeyName);
			if (!string.IsNullOrEmpty(URLKeyName) && !((ContentItemDisplayBase)this).IsContentDesignMode)
			{
				text = string.Format(CultureInfo.InvariantCulture, "{0}#{1}", text, URLKeyName);
			}
			((UserControl)this).Response.Redirect(text);
		}
	}

	[ExcludeFromCodeCoverage]
	private void DisplayTabs(bool designMode, List<TabbedDialogItem> currentSettings, RadTabStrip radTabControl, RadMultiPage radPageControl, bool wizardMode, bool sequentialSteps)
	{
		//IL_014e: Unknown result type (might be due to invalid IL or missing references)
		//IL_0155: Expected O, but got Unknown
		//IL_0075: Unknown result type (might be due to invalid IL or missing references)
		//IL_007a: Unknown result type (might be due to invalid IL or missing references)
		//IL_008d: Unknown result type (might be due to invalid IL or missing references)
		//IL_00ab: Expected O, but got Unknown
		//IL_00ab: Unknown result type (might be due to invalid IL or missing references)
		//IL_00b0: Unknown result type (might be due to invalid IL or missing references)
		//IL_00cc: Expected O, but got Unknown
		//IL_00cf: Expected O, but got Unknown
		if (designMode)
		{
			if (((StateManagedCollection)(object)radTabControl.Tabs).Count != 0)
			{
				((StateManagedCollection)(object)radTabControl.Tabs).Clear();
			}
			if (((ControlCollection)(object)radPageControl.PageViews).Count != 0)
			{
				((ControlCollection)(object)radPageControl.PageViews).Clear();
			}
		}
		if (currentSettings != null && currentSettings.Count != 0)
		{
			foreach (TabbedDialogItem currentSetting in currentSettings)
			{
				RadTab val = new RadTab
				{
					Text = currentSetting.TabCaption.Trim(),
					Value = currentSetting.Index.ToString(CultureInfo.InvariantCulture)
				};
				RadPageView val2 = new RadPageView();
				((Control)val2).ID = "Page_" + currentSetting.Index;
				RadPageView val3 = val2;
				if (((Control)(object)this).FindControl(((Control)(object)val3).ID) == null)
				{
					radPageControl.PageViews.Add(val3);
				}
				if (radTabControl.FindTabByValue(((ControlItem)val).Value) == null)
				{
					radTabControl.Tabs.Add(val);
				}
			}
		}
		foreach (RadTab item in (StateManagedCollection)(object)radTabControl.Tabs)
		{
			RadTab val4 = item;
			if (((Control)(object)val4.PageView).Controls.Count != 0 && designMode)
			{
				((Control)(object)val4.PageView).Controls.Clear();
			}
			if (((Control)(object)val4.PageView).Controls.Count == 0)
			{
				((Control)(object)val4.PageView).Controls.Add(GenerateInfoPanelforTab(((ControlItem)val4).Value, currentSettings, designMode, wizardMode, sequentialSteps));
			}
		}
	}

	[ExcludeFromCodeCoverage]
	private static Control GenerateInfoPanelforTab(string index, List<TabbedDialogItem> currentSettings, bool designMode, bool wizardMode, bool sequentialSteps)
	{
		//IL_004a: Unknown result type (might be due to invalid IL or missing references)
		//IL_004f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0060: Expected O, but got Unknown
		//IL_0061: Unknown result type (might be due to invalid IL or missing references)
		//IL_0069: Unknown result type (might be due to invalid IL or missing references)
		//IL_0071: Unknown result type (might be due to invalid IL or missing references)
		//IL_0079: Unknown result type (might be due to invalid IL or missing references)
		//IL_0084: Expected O, but got Unknown
		//IL_0087: Expected O, but got Unknown
		Control result = new Control();
		foreach (TabbedDialogItem currentSetting in currentSettings)
		{
			if (!(currentSetting.Index.ToString(CultureInfo.InvariantCulture) == index))
			{
				continue;
			}
			if (designMode)
			{
				PanelTemplateControl2 val = new PanelTemplateControl2();
				((Control)val).ID = "Pan_Page_" + index;
				((PanelTemplateControl)val).Collapsible = false;
				((PanelTemplateControl)val).ShowHeader = false;
				val.ShowBorder = false;
				((WebControl)val).CssClass = "ContentTabbedDisplay AddPadding";
				PanelTemplateControl2 val2 = val;
				Content fromContentKey = Content.GetFromContentKey(currentSetting.ContentItemKey, (BusinessContainer)null, false);
				string text = string.Empty;
				string arg2;
				if (fromContentKey != null)
				{
					string arg = string.Format(CultureInfo.InvariantCulture, "javascript:ShowDialog_NoReturnValue('~/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iUniformKey={0}&iMode=Edit&iOperation=Edit&TemplateType=E&DocumentTypeCode=CON&IsPopup=true',null,'99%', '99%','Content designer',null,'E',CallbackRefresh,null,false,true,null,null);", currentSetting.ContentItemKey);
					arg2 = string.Format(CultureInfo.InvariantCulture, "&#8226; Content record location: <a href=\"{0}\">{1}</a><br/>", arg, currentSetting.ContentItemPath);
					text = fromContentKey.ContentTitle;
				}
				else
				{
					string phrase = ResourceManager.GetPhrase("ContentNotFound", "the specified content was not found");
					arg2 = string.Format(CultureInfo.InvariantCulture, "&#8226; Content record location: {0}", phrase);
				}
				text = ((!string.IsNullOrEmpty(text)) ? text : currentSetting.ContentItemName);
				Label label = new Label
				{
					Text = string.Empty
				};
				label.Text += ((!string.IsNullOrEmpty(currentSetting.ContentItemName)) ? string.Format(CultureInfo.InvariantCulture, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.ContentRecordInfo", "<br/>&#8226; This tab will display the following content record: <b>{0}</b><br/>{1}"), text, arg2) : ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NoContentRecordInfo", "<br/>&#8226; This tab will be displayed as empty because there is no content record selected.<br/>"));
				if (currentSetting.Default && !wizardMode)
				{
					label.Text += ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.DefaultTabInfo", "<br/>&#8226; This tab will be selected by default.");
				}
				if (wizardMode)
				{
					label.Text += (currentSetting.IsHidden ? ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.HiddenStepInfo", "&#8226; This is a hidden step.<br/>") : ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.RegularStepInfo", "&#8226; This is a regular step.<br/>"));
					if (!sequentialSteps)
					{
						if (currentSetting.OnSuccess == 0)
						{
							label.Text += string.Format(CultureInfo.InvariantCulture, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.OnSuccessStep", "&#8226; If step validation is <b>Successful</b> the next step is: <b>{0}</b><br/>"), ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.Dynamic.Default", "[Default]"));
						}
						else
						{
							label.Text += string.Format(CultureInfo.InvariantCulture, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.OnSuccessStep", "&#8226; If step validation is <b>Successful</b> the next step is: <b>{0}</b><br/>"), GetTabNamebyIndex(currentSettings, currentSetting.OnSuccess));
						}
						if (currentSetting.OnFail == 0)
						{
							label.Text += string.Format(CultureInfo.InvariantCulture, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.OnFailStep", "&#8226; If step validation has <b>Failed</b> the next step is: <b>{0}</b><br/>"), ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.Dynamic.Default", "[Default]"));
						}
						else
						{
							label.Text += string.Format(CultureInfo.InvariantCulture, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.OnFailStep", "&#8226; If step validation has <b>Failed</b> the next step is: <b>{0}</b><br/>"), GetTabNamebyIndex(currentSettings, currentSetting.OnFail));
						}
					}
				}
				((Control)(object)val2).Controls.Add(label);
				result = (Control)(object)val2;
			}
			else
			{
				PlaceHolder placeHolder = new PlaceHolder();
				Panel panel = new Panel
				{
					CssClass = "ContentTabbedDisplay AddPadding"
				};
				HtmlGenericControl htmlGenericControl = new HtmlGenericControl("p");
				htmlGenericControl.Attributes.Add("class", "AsiWarning");
				htmlGenericControl.InnerText = ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NoContentFound", "No content found");
				placeHolder.ID = "Pan_Page_" + index;
				panel.Controls.Add(htmlGenericControl);
				placeHolder.Controls.Add(panel);
				result = placeHolder;
			}
		}
		return result;
	}

	private static string GetTabNamebyIndex(List<TabbedDialogItem> currentSettings, int tabIndex)
	{
		string result = string.Empty;
		if (currentSettings != null && currentSettings.Count > 0)
		{
			using IEnumerator<TabbedDialogItem> enumerator = currentSettings.Where((TabbedDialogItem tmp) => tmp.Index == tabIndex).GetEnumerator();
			if (enumerator.MoveNext())
			{
				TabbedDialogItem current = enumerator.Current;
				result = current.TabCaption;
			}
		}
		return result;
	}

	private void GetChildCommandButtons()
	{
		//IL_0012: Unknown result type (might be due to invalid IL or missing references)
		//IL_0018: Expected O, but got Unknown
		if (((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			return;
		}
		CommandButtonRequisiteArgs val = new CommandButtonRequisiteArgs();
		((UserControlBase)this).CommandButtonRequisites(val);
		List<string> list = new List<string>();
		list.AddRange(val.GetValidationGroupList((CommandButtonType)4));
		list.AddRange(val.GetValidationGroupList((CommandButtonType)2));
		list.AddRange(val.GetValidationGroupList((CommandButtonType)512));
		list.AddRange(val.GetValidationGroupList((CommandButtonType)8));
		string arg = "undefined";
		if (list.Count > 0)
		{
			arg = string.Format(CultureInfo.InvariantCulture, "new Array({0})", string.Join(",", list.ToArray()));
		}
		string text = string.Format(CultureInfo.InvariantCulture, "return RunAllValidators({0}, true);", arg);
		if (list.Count > 0)
		{
			Button button = (Button)((Control)(object)this).FindControl("btnNext_" + (string.IsNullOrEmpty(CurrentTabIndex) ? "1" : CurrentTabIndex));
			if (button != null)
			{
				button.OnClientClick += text;
			}
		}
		if (((Control)(object)this).Page.Master == null || !WizardMode)
		{
			return;
		}
		Collection<Control> collection = CommonCode.FindControlsRecursive(typeof(CommandButtonBar), ((Control)(object)this).Page.Master.Controls, recursion: true);
		if (collection == null || collection.Count <= 0)
		{
			return;
		}
		foreach (Control item in collection)
		{
			item.Visible = false;
		}
	}

	[ExcludeFromCodeCoverage]
	private void RenderStepLayout(TabbedDialogItem currentStep, List<TabbedDialogItem> currentSettings)
	{
		if ((bool)CommonCode.GetEnumValueByType(DisplayStyle, typeof(NotTabsAttribute)))
		{
			((Control)(object)radTab_Bottom).Visible = false;
			((Control)(object)radTab_Top).Visible = false;
			((Control)(object)radPage).Visible = false;
			panStep.Visible = true;
			if (panStep.Controls.Count == 0)
			{
				panStep.Controls.Add(GenerateContentPanelforTabRunTime(currentStep.Index.ToString(CultureInfo.InvariantCulture), currentSettings));
			}
			return;
		}
		panStep.Visible = false;
		((Control)(object)radPage).Visible = true;
		RadTabStrip val = (((Control)(object)radTab_Bottom).Visible ? radTab_Bottom : radTab_Top);
		if (SequentialSteps)
		{
			DisplayWorkflowTabsRunTime(currentStep, currentSettings, val, radPage);
		}
		else
		{
			DisplayWorkflowTabsRunTime(currentStep, currentSettings, val, radPage, StepsCompletedbyWorkflow);
		}
		if (val.FindTabByValue(currentStep.Index.ToString(CultureInfo.InvariantCulture)) != null)
		{
			val.FindTabByValue(currentStep.Index.ToString(CultureInfo.InvariantCulture)).Selected = true;
			val.FindTabByValue(currentStep.Index.ToString(CultureInfo.InvariantCulture)).PageView.Selected = true;
		}
	}

	[ExcludeFromCodeCoverage]
	private void RenderStepContent(TabbedDialogItem currentStep, List<TabbedDialogItem> currentSettings)
	{
		if (((Control)(object)this).FindControl("phContent_" + currentStep.Index) != null)
		{
			PlaceHolder resultsPanel = (PlaceHolder)((Control)(object)this).FindControl("phContent_" + currentStep.Index);
			if (currentStep.ContentItemKey != Guid.Empty)
			{
				CommonCode.RenderContentRecordDisplay(currentStep.ContentItemKey, resultsPanel, ((UserControlBase)this).StatefulBusinessContainer, ((Control)(object)this).Page);
			}
		}
		if (((Control)(object)this).FindControl("StepCaptionLabel_" + currentStep.Index) == null)
		{
			return;
		}
		if (SequentialSteps)
		{
			switch (DisplayStyle)
			{
			case DisplayStyle.FSNumbered:
				((Label)((Control)(object)this).FindControl("StepCaptionLabel_" + currentStep.Index)).Text = currentStep.TabCaption;
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				((Label)((Control)(object)this).FindControl("StepNumberLabel_" + currentStep.Index)).Text = string.Format(CultureInfo.InvariantCulture, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NumberStepsCaptionFixed", "Step {0} of {1}"), CommonCode.GetCurrentFixedStepNumber(currentStep, currentSettings), CommonCode.GetTotalStepsCount(currentSettings));
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("border-bottom", "1px solid black");
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0.5em");
				break;
			case DisplayStyle.FSUnnumbered:
				((Label)((Control)(object)this).FindControl("StepCaptionLabel_" + currentStep.Index)).Text = currentStep.TabCaption;
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("border-bottom", "1px solid black");
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0.5em");
				((Label)((Control)(object)this).FindControl("StepNumberLabel_" + currentStep.Index)).Text = string.Empty;
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				break;
			default:
				((Label)((Control)(object)this).FindControl("StepCaptionLabel_" + currentStep.Index)).Text = string.Empty;
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				((Label)((Control)(object)this).FindControl("StepNumberLabel_" + currentStep.Index)).Text = string.Empty;
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				break;
			}
		}
		else
		{
			switch (DisplayStyle)
			{
			case DisplayStyle.FSNumbered:
				((Label)((Control)(object)this).FindControl("StepCaptionLabel_" + currentStep.Index)).Text = currentStep.TabCaption;
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				((Label)((Control)(object)this).FindControl("StepNumberLabel_" + currentStep.Index)).Text = string.Format(CultureInfo.InvariantCulture, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NumberStepsCaptionDynamic", "Step {0}"), CommonCode.GetCurrentFixedStepNumber(currentStep, currentSettings));
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("border-bottom", "1px solid black");
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0.5em");
				break;
			case DisplayStyle.FSUnnumbered:
				((Label)((Control)(object)this).FindControl("StepCaptionLabel_" + currentStep.Index)).Text = currentStep.TabCaption;
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("border-bottom", "1px solid black");
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0.5em");
				((Label)((Control)(object)this).FindControl("StepNumberLabel_" + currentStep.Index)).Text = string.Empty;
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				break;
			default:
				((Label)((Control)(object)this).FindControl("StepCaptionLabel_" + currentStep.Index)).Text = string.Empty;
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepCaptionPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				((Label)((Control)(object)this).FindControl("StepNumberLabel_" + currentStep.Index)).Text = string.Empty;
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("border-bottom", "0px solid black");
				((Panel)((Control)(object)this).FindControl("StepNumberPanel_" + currentStep.Index)).Style.Add("margin-bottom", "0");
				break;
			}
		}
	}

	[ExcludeFromCodeCoverage]
	private void DisplayWorkflowTabsRunTime(TabbedDialogItem currentStep, List<TabbedDialogItem> currentSettings, RadTabStrip currentTabStrip, RadMultiPage currentRadPage, List<int> processedSteps = null)
	{
		//IL_020b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0212: Expected O, but got Unknown
		//IL_00c6: Unknown result type (might be due to invalid IL or missing references)
		//IL_00cd: Expected O, but got Unknown
		//IL_00ce: Unknown result type (might be due to invalid IL or missing references)
		//IL_00d5: Expected O, but got Unknown
		bool flag = processedSteps != null;
		if (currentSettings != null && currentSettings.Count != 0)
		{
			foreach (TabbedDialogItem tmp in currentSettings)
			{
				bool flag2;
				if (!flag)
				{
					flag2 = true;
				}
				else
				{
					flag2 = false;
					if (processedSteps.Count == 0)
					{
						if (tmp.Index == 1)
						{
							flag2 = true;
						}
					}
					else if (processedSteps.Any((int i) => i == tmp.Index))
					{
						flag2 = true;
					}
					if (tmp.Index == currentStep.Index)
					{
						flag2 = true;
					}
				}
				if (!flag2)
				{
					continue;
				}
				RadTab val = new RadTab();
				try
				{
					RadPageView val2 = new RadPageView();
					try
					{
						((WebControl)(object)val).Enabled = tmp.Index <= currentStep.Index;
						if (tmp.IsHidden)
						{
							((Control)(object)val).Visible = false;
						}
						((Control)(object)val2).ID = "Page_" + tmp.Index;
						((ControlItem)val).Text = tmp.TabCaption.Trim();
						((ControlItem)val).Value = tmp.Index.ToString(CultureInfo.InvariantCulture);
						if (((Control)(object)this).FindControl(((Control)(object)val2).ID) == null)
						{
							currentRadPage.PageViews.Add(val2);
						}
					}
					finally
					{
						((IDisposable)val2)?.Dispose();
					}
					if (currentTabStrip.FindTabByValue(((ControlItem)val).Value) == null)
					{
						currentTabStrip.Tabs.Add(val);
					}
				}
				finally
				{
					((IDisposable)val)?.Dispose();
				}
			}
		}
		foreach (RadTab item in (StateManagedCollection)(object)currentTabStrip.Tabs)
		{
			RadTab val3 = item;
			if (((Control)(object)val3.PageView).Controls.Count == 0)
			{
				((Control)(object)val3.PageView).Controls.Add(GenerateContentPanelforTabRunTime(((ControlItem)val3).Value, currentSettings));
			}
		}
	}

	[ExcludeFromCodeCoverage]
	private Control GenerateContentPanelforTabRunTime(string index, List<TabbedDialogItem> currentSettings)
	{
		Control result = new Control();
		foreach (TabbedDialogItem currentSetting in currentSettings)
		{
			if (!(currentSetting.Index.ToString(CultureInfo.InvariantCulture) != index))
			{
				Panel panel = new Panel
				{
					ID = "Pan_Page_" + index
				};
				if ((bool)CommonCode.GetEnumValueByType(DisplayStyle, typeof(NotTabsAttribute)))
				{
					Panel panel2 = new Panel
					{
						ID = "StepCaptionPanel_" + index
					};
					panel2.Style.Add("text-align", "left");
					Label label = new Label
					{
						ID = "StepCaptionLabel_" + index
					};
					label.Style.Add("border-bottom", "solid 0px black");
					label.CssClass = "TitleBarCaption";
					panel2.Controls.Add(label);
					panel.Controls.Add(panel2);
					panel2 = new Panel
					{
						ID = "StepNumberPanel_" + index
					};
					panel2.Style.Add("text-align", "left");
					label = new Label
					{
						ID = "StepNumberLabel_" + index
					};
					label.Style.Add("text-align", "left");
					panel2.Controls.Add(label);
					panel.Controls.Add(panel2);
				}
				Panel child = new Panel
				{
					ID = "ErrorMessagePanel_" + index
				};
				panel.Controls.Add(child);
				child = new Panel
				{
					ID = "panPlaceholder_" + index
				};
				PlaceHolder child2 = new PlaceHolder
				{
					ID = "phContent_" + index
				};
				child.Controls.Add(child2);
				panel.Controls.Add(child);
				Panel panel3 = new Panel
				{
					ID = "pan_Buttons_" + index
				};
				child = new Panel
				{
					CssClass = "CommandBar",
					ID = "pan_Btns_" + index
				};
				panel3.Attributes.Add("translate", "yes");
				Button button = new Button
				{
					ID = "btnPrevious_" + index,
					Text = ResourceManager.GetWord("Previous"),
					CausesValidation = false,
					CssClass = "TextButton"
				};
				button.Click += NextPreviousButton_Click;
				button.Visible = !CommonCode.GetCurrentStepPosition(index, currentSettings, needFirst: true);
				child.Controls.Add(button);
				updatePanel.Triggers.Add(new AsyncPostBackTrigger
				{
					ControlID = button.ID,
					EventName = "Click"
				});
				button = new Button
				{
					ID = "btnNext_" + index,
					CssClass = "TextButton PrimaryButton"
				};
				button.Click += NextPreviousButton_Click;
				bool currentStepPosition = CommonCode.GetCurrentStepPosition(index, currentSettings, needFirst: false);
				button.Text = (currentStepPosition ? ResourceManager.GetWord("Finish") : ResourceManager.GetWord("Next"));
				child.Controls.Add(button);
				updatePanel.Triggers.Add(new AsyncPostBackTrigger
				{
					ControlID = button.ID,
					EventName = "Click"
				});
				panel3.Controls.Add(child);
				panel.Controls.Add(panel3);
				result = panel;
			}
		}
		return result;
	}

	private bool ValidateWorkFlowStep(TabbedDialogItem currentStep)
	{
		//IL_00a6: Unknown result type (might be due to invalid IL or missing references)
		//IL_00ad: Expected O, but got Unknown
		PlaceHolder placeHolder = null;
		if (((Control)(object)this).FindControl("phContent_" + currentStep.Index) != null)
		{
			placeHolder = (PlaceHolder)((Control)(object)this).FindControl("phContent_" + currentStep.Index);
		}
		List<Control> contentRecordItems = CommonCode.GetContentRecordItems(currentStep.ContentItemKey);
		if (contentRecordItems.Count == 0)
		{
			return true;
		}
		Dictionary<string, UserControlBase> dictionary = new Dictionary<string, UserControlBase>();
		foreach (Control item in contentRecordItems)
		{
			if (placeHolder != null)
			{
				UserControlBase val = (UserControlBase)CommonCode.FindControlRecursive(placeHolder.Controls, item.ID);
				if (val != null)
				{
					dictionary.Add(item.ID, val);
				}
			}
		}
		int num = PerformControlsValidate(dictionary, currentStep, placeHolder, SequentialSteps);
		if (num == 0)
		{
			num = PerformControlsPreCommit(dictionary, currentStep, placeHolder, SequentialSteps);
		}
		if (num == 0 && currentStep.IsHidden)
		{
			((Control)(object)this).Page.Validate();
		}
		if (num == 0 && !((Control)(object)this).Page.IsValid)
		{
			num = 1;
		}
		if (num == 0)
		{
			num = PerformControlsCommit(dictionary, currentStep, placeHolder);
		}
		if (num == 0)
		{
			PerformControlsPostCommit(dictionary, currentStep, placeHolder);
		}
		string phrase = ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.StepValidationError", "Unable to process your request. See error details below.<br/>");
		DisplayControlError((Control)(object)this, "ErrorMessagePanel_" + currentStep.Index, (num == 0) ? null : phrase);
		return num == 0;
	}

	private static int PerformControlsValidate(Dictionary<string, UserControlBase> controlstoValidate, TabbedDialogItem currentStep, PlaceHolder currentPlaceHolder, bool sequentialWorklow)
	{
		//IL_002f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0036: Expected O, but got Unknown
		int num = 0;
		if (currentPlaceHolder == null || currentStep == null)
		{
			return num;
		}
		foreach (KeyValuePair<string, UserControlBase> item in controlstoValidate)
		{
			ValidateArgs val = new ValidateArgs();
			item.Value.Validate(val);
			if ((!val.Succeeded && !sequentialWorklow) || (!val.Succeeded && sequentialWorklow && !currentStep.IsHidden))
			{
				num++;
				DisplayControlError(currentPlaceHolder, "ControlErrorPanel_" + ((Control)(object)item.Value).ID, val.ValidationMessage);
			}
			else
			{
				DisplayControlError(currentPlaceHolder, "ControlErrorPanel_" + ((Control)(object)item.Value).ID, null);
			}
		}
		return num;
	}

	[ExcludeFromCodeCoverage]
	private static int PerformControlsPreCommit(Dictionary<string, UserControlBase> controlstoValidate, TabbedDialogItem currentStep, PlaceHolder currentPlaceHolder, bool sequentialWorklow)
	{
		//IL_002f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0036: Expected O, but got Unknown
		int num = 0;
		if (currentPlaceHolder == null || currentStep == null)
		{
			return num;
		}
		foreach (KeyValuePair<string, UserControlBase> item in controlstoValidate)
		{
			PreCommitArgs val = new PreCommitArgs();
			val.AddAtomForSave(item.Value.Atom);
			item.Value.PreCommit(val);
			if ((val.CancellationRequest && !sequentialWorklow) || (val.CancellationRequest && sequentialWorklow && !currentStep.IsHidden))
			{
				num++;
				DisplayControlError(currentPlaceHolder, "ControlErrorPanel_" + ((Control)(object)item.Value).ID, val.CancellationMessage);
			}
			else
			{
				DisplayControlError(currentPlaceHolder, "ControlErrorPanel_" + ((Control)(object)item.Value).ID, null);
			}
		}
		return num;
	}

	[ExcludeFromCodeCoverage]
	private int PerformControlsCommit(Dictionary<string, UserControlBase> controlstoValidate, TabbedDialogItem currentStep, PlaceHolder currentPlaceHolder)
	{
		int num = 0;
		if (currentPlaceHolder == null || currentStep == null)
		{
			return num;
		}
		foreach (KeyValuePair<string, UserControlBase> item in controlstoValidate)
		{
			item.Value.Commit();
			if (item.Value.UserControlMessages.Any((UserControlMessage msg) => ((object)msg.MessageType/*cast due to .constrained prefix*/).Equals((object)(UserControlMessageTypes)4)) || item.Value.ChildUserControls.Any((IUserControl cc) => cc.UserControlMessages.Any((UserControlMessage msg) => ((object)msg.MessageType/*cast due to .constrained prefix*/).Equals((object)(UserControlMessageTypes)4))))
			{
				num++;
			}
			DisplayControlError(currentPlaceHolder, "ControlErrorPanel_" + ((Control)(object)item.Value).ID, null);
			if (((iPartDisplayBase)this).IsV10 && ((UserControl)this).Session["Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.PartyId"] != null)
			{
				createdPartyId = (string)((UserControl)this).Session["Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.PartyId"];
			}
			else if (((UserControl)this).Session["Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.ContactKey"] != null)
			{
				createdPartyId = (string)((UserControl)this).Session["Asi.Web.iParts.ContactManagement.ContactAccountCreatorDisplay.ContactKey"];
			}
		}
		return num;
	}

	[ExcludeFromCodeCoverage]
	private static void PerformControlsPostCommit(Dictionary<string, UserControlBase> controlstoValidate, TabbedDialogItem currentStep, PlaceHolder currentPlaceHolder)
	{
		if (currentPlaceHolder == null || currentStep == null)
		{
			return;
		}
		foreach (KeyValuePair<string, UserControlBase> item in controlstoValidate)
		{
			item.Value.PostCommit();
			DisplayControlError(currentPlaceHolder, "ControlErrorPanel_" + ((Control)(object)item.Value).ID, null);
		}
	}

	[ExcludeFromCodeCoverage]
	private static void DisplayControlError(Control currentBaseControl, string controlId, string errorMessage)
	{
		if (string.IsNullOrEmpty(controlId))
		{
			return;
		}
		Panel panel = ((currentBaseControl is PlaceHolder) ? ((Panel)CommonCode.FindControlRecursive(currentBaseControl.Controls, controlId)) : ((!(currentBaseControl is Page)) ? null : ((Panel)currentBaseControl.FindControl(controlId))));
		if (panel != null)
		{
			panel.Controls.Clear();
			if (string.IsNullOrEmpty(errorMessage))
			{
				panel.Style.Add("display", "none");
				return;
			}
			panel.Controls.Add(new Label
			{
				Text = errorMessage
			});
			panel.Style.Add("Display", "Block");
		}
	}

	private void RenderWorkFlowStep()
	{
		string currentTabIndex = CurrentTabIndex;
		if (string.IsNullOrEmpty(currentTabIndex))
		{
			StepsCompletedbyWorkflow.Clear();
		}
		List<TabbedDialogItem> list = null;
		CommonCode commonCode = new CommonCode();
		if (!string.IsNullOrEmpty(TabbedDialogSettings))
		{
			list = CommonCode.DeserializeSettings(TabbedDialogSettings, DocumentService, commonCode.ItemListSep, commonCode.ItemValuesSep, ((ContentItemDisplayBase)this).IsContentDesignMode, isStaffUser);
		}
		if (list == null)
		{
			return;
		}
		TabbedDialogItem tabItemByIndexOrName = CommonCode.GetTabItemByIndexOrName(currentTabIndex, list, honorDefault: false);
		CheckForUrlParameters(tabItemByIndexOrName);
		RenderStepLayout(tabItemByIndexOrName, list);
		RenderStepContent(tabItemByIndexOrName, list);
		PlaceHolder placeHolder = (PlaceHolder)((Control)(object)this).FindControl("phContent_" + (string.IsNullOrEmpty(CommonCode.GetTabItemByIndexOrName(currentTabIndex, list, honorDefault: false).Index.ToString(CultureInfo.InvariantCulture)) ? "1" : CommonCode.GetTabItemByIndexOrName(currentTabIndex, list, honorDefault: false).Index.ToString(CultureInfo.InvariantCulture)));
		foreach (IUserControl item in placeHolder.Controls.OfType<Panel>().SelectMany((Panel panel) => panel.Controls.OfType<IUserControl>()))
		{
			((UserControlBase)this).AddChildUserControl(item);
		}
	}
}
