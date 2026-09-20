using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Linq;
using System.Web.UI;
using System.Web.UI.WebControls;
using Asi.Business;
using Asi.Business.ContentManagement;
using Asi.Soa.Core.ServiceContracts;
using Asi.Web.UI;
using Asi.Web.UI.WebControls;
using Asi.Web.iParts.Common.ContentCollectionOrganizer.Common;
using Autofac.Integration.Web.Forms;
using Telerik.Web.UI;

namespace Asi.Web.iParts.Common.ContentCollectionOrganizer;

[InjectProperties]
public class DynamicContentCollectionOrganizerDisplay : iPartDisplayBase
{
	private DynamicContentCollectionOrganizerCommon item;

	private bool isBound;

	private bool refreshExisting;

	private iPartDisplayBase refreshingPart;

	private RadAjaxPanel refreshingPanel;

	private bool isStaffUser;

	private string tabbedDialogSettings;

	protected Literal TabPanelAnchor;

	protected Label InfoControl;

	protected Label MoreInfoControl;

	protected Panel MainContentControl;

	protected RadTabStrip radTab_Top;

	protected RadMultiPage radPage;

	protected UpdatePanel updatePanel;

	protected Button refreshTrigger;

	protected Panel panStep;

	protected Label debug;

	public IDocumentService DocumentService { get; set; }

	[ExcludeFromCodeCoverage]
	public string TabbedDialogSettings
	{
		get
		{
			if (string.IsNullOrEmpty(tabbedDialogSettings))
			{
				return tabbedDialogSettings = CommonCode.GenerateDynamicTabSettings(SourceKey, DefaultSourceKey, DocumentService);
			}
			return tabbedDialogSettings;
		}
		set
		{
			tabbedDialogSettings = value;
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
	public Guid SourceKey
	{
		get
		{
			return (((ContentItemDisplayBase)this).ContentItem is DynamicContentCollectionOrganizerCommon dynamicContentCollectionOrganizerCommon) ? dynamicContentCollectionOrganizerCommon.SourceKey : Guid.Empty;
		}
		set
		{
			((Control)(object)this).ViewState["SourceKey"] = value;
		}
	}

	[ExcludeFromCodeCoverage]
	public Guid DefaultSourceKey
	{
		get
		{
			return (((ContentItemDisplayBase)this).ContentItem is DynamicContentCollectionOrganizerCommon dynamicContentCollectionOrganizerCommon) ? dynamicContentCollectionOrganizerCommon.DefaultSourceKey : Guid.Empty;
		}
		set
		{
			((Control)(object)this).ViewState["DefaultSourceKey"] = value;
		}
	}

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

	protected override void OnPreRender(EventArgs e)
	{
		((iPartDisplayBase)this).OnPreRender(e);
		if (((iPartDisplayBase)this).DoNotRenderInDesignMode && ((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			((ContentItemDisplayBase)this).HideContent = true;
		}
		GetChildCommandButtons();
	}

	protected override void CreateChildControls()
	{
		//IL_01a9: Unknown result type (might be due to invalid IL or missing references)
		//IL_01b0: Expected O, but got Unknown
		//IL_024b: Unknown result type (might be due to invalid IL or missing references)
		//IL_0252: Expected O, but got Unknown
		((ContentItemDisplayBase)this).CreateChildControls();
		if (((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			return;
		}
		CommonCode commonCode = new CommonCode();
		RefreshForm();
		RadTabStrip val = radTab_Top;
		if (string.IsNullOrEmpty(TabbedDialogSettings))
		{
			return;
		}
		List<TabbedDialogItem> list = CommonCode.DeserializeSettings(TabbedDialogSettings, DocumentService, commonCode.ItemListSep, commonCode.ItemValuesSep, includeWorkingContent: false, isStaffUser);
		if (list == null)
		{
			return;
		}
		if (list.Any((TabbedDialogItem p) => p.ContentItemKey.Equals(((ContentItemDisplayBase)this).ContentKey)))
		{
			TabbedDialogItem tabbedDialogItem = list.First((TabbedDialogItem p) => p.ContentItemKey.Equals(((ContentItemDisplayBase)this).ContentKey));
			list.Remove(tabbedDialogItem);
		}
		TabbedDialogItem tabItemByIndexOrName = CommonCode.GetTabItemByIndexOrName(CurrentTabIndex, list, honorDefault: true);
		if (((Control)(object)this).FindControl("Pan_Page_" + tabItemByIndexOrName.Index) == null)
		{
			return;
		}
		PlaceHolder placeHolder = (PlaceHolder)((Control)(object)this).FindControl("Pan_Page_" + tabItemByIndexOrName.Index);
		placeHolder.Controls.Clear();
		if (tabItemByIndexOrName.ContentItemKey != Guid.Empty)
		{
			CommonCode.RenderContentRecordDisplay(tabItemByIndexOrName.ContentItemKey, placeHolder, ((UserControlBase)this).StatefulBusinessContainer, ((Control)(object)this).Page);
		}
		foreach (IUserControl item in placeHolder.Controls.OfType<Panel>().SelectMany((Panel panel) => panel.Controls.OfType<IUserControl>()))
		{
			((UserControlBase)this).AddChildUserControl(item);
			iPartDisplayBase val2 = (iPartDisplayBase)(object)((item is iPartDisplayBase) ? item : null);
			if (val2 == null)
			{
				continue;
			}
			object obj = (object)new RadAjaxPanel();
			if (((UserControlBase)val2).GetObjectProviderData() != null && ((UserControlBase)val2).GetObjectProviderData().GetType() == obj.GetType())
			{
				object objectProviderData = ((UserControlBase)val2).GetObjectProviderData();
				RadAjaxPanel val3 = (RadAjaxPanel)((objectProviderData is RadAjaxPanel) ? objectProviderData : null);
				if (val3 != null && ((RadAjaxControl)val3).IsAjaxRequest)
				{
					refreshingPart = val2;
					refreshingPanel = val3;
					refreshExisting = true;
				}
			}
		}
		foreach (RadTab item2 in (StateManagedCollection)(object)val.Tabs)
		{
			RadTab val4 = item2;
			if (((ControlItem)val4).Value != tabItemByIndexOrName.Index.ToString(CultureInfo.InvariantCulture))
			{
				continue;
			}
			val4.Selected = true;
			val4.PageView.Selected = true;
			((ContentItemDisplayBase)this).DynamicContentPageTitle = ((ControlItem)val4).Text;
			break;
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
		((UserControl)this).Response.Redirect(text);
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

	public override ContentItem CreateContentItem()
	{
		DynamicContentCollectionOrganizerCommon dynamicContentCollectionOrganizerCommon = new DynamicContentCollectionOrganizerCommon();
		((ContentItem)dynamicContentCollectionOrganizerCommon).ContentItemKey = ((ContentItemDisplayBase)this).ContentItemKey;
		item = dynamicContentCollectionOrganizerCommon;
		return (ContentItem)(object)item;
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
			if (item != null)
			{
				URLKeyName = ((ContentItem)item).ContentItemName.Trim().Replace("+", "_");
				URLKeyName = URLKeyName.Replace(" ", "_");
			}
			else if (SourceKey.ToString().Length > 8)
			{
				string text = SourceKey.ToString().Substring(0, 8);
				URLKeyName = text.Trim().Replace("+", "_");
				URLKeyName = URLKeyName.Replace(" ", "_");
			}
			else
			{
				URLKeyName = "tab";
			}
		}
		CurrentTabIndex = ((UserControl)this).Request.QueryString[URLKeyName];
		MoreInfoControl.Visible = isContentDesignMode;
		if (isContentDesignMode)
		{
			MoreInfoControl.Text = ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NonWizardModeMessage", "This dynamic content item will run as a tabbed dialog.");
		}
		InfoControl.Visible = isContentDesignMode;
		ConfigTabbedDialog(isContentDesignMode);
	}

	[ExcludeFromCodeCoverage]
	private void ConfigTabbedDialog(bool designMode)
	{
		//IL_00b2: Unknown result type (might be due to invalid IL or missing references)
		//IL_00bc: Expected O, but got Unknown
		//IL_0208: Unknown result type (might be due to invalid IL or missing references)
		//IL_0212: Expected O, but got Unknown
		CommonCode commonCode = new CommonCode();
		radTab_Top.ShowBaseLine = true;
		((Control)(object)radTab_Top).Visible = true;
		radTab_Top.Orientation = (TabStripOrientation)0;
		((WebControl)(object)radPage).Style.Add("float", "none");
		((WebControl)(object)radTab_Top).Style.Add("float", "none");
		if (designMode)
		{
			radPage.RenderSelectedPageOnly = false;
			radTab_Top.AutoPostBack = false;
		}
		else
		{
			radPage.RenderSelectedPageOnly = false;
			radTab_Top.AutoPostBack = true;
			radTab_Top.TabClick += new RadTabStripEventHandler(Tab_TabClick);
			if (updatePanel.Triggers.Count > 0)
			{
				updatePanel.Triggers.Clear();
			}
			updatePanel.Triggers.Add(new AsyncPostBackTrigger
			{
				ControlID = ((Control)(object)radTab_Top).ID,
				EventName = "TabClick"
			});
		}
		List<TabbedDialogItem> list = new List<TabbedDialogItem>();
		if (TabbedDialogSettings != null)
		{
			list = CommonCode.DeserializeSettings(TabbedDialogSettings, DocumentService, commonCode.ItemListSep, commonCode.ItemValuesSep, ((ContentItemDisplayBase)this).IsContentDesignMode, isStaffUser);
		}
		if (list.Any((TabbedDialogItem p) => p.ContentItemKey.Equals(((ContentItemDisplayBase)this).ContentKey)))
		{
			TabbedDialogItem tabbedDialogItem = list.First((TabbedDialogItem p) => p.ContentItemKey.Equals(((ContentItemDisplayBase)this).ContentKey));
			list.Remove(tabbedDialogItem);
		}
		if (list == null || list.Count == 0)
		{
			((Control)(object)radTab_Top).Visible = false;
			((Control)(object)radPage).Visible = false;
			if (designMode)
			{
				InfoControl.Visible = true;
				InfoControl.Text = ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NoTabs", "This dynamic content item is not configured or the content folder is empty.");
			}
			else
			{
				((UserControlBase)this).AddUserMessage(new UserControlMessage((UserControlMessageTypes)2, ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.NoTabs", "This dynamic content item is not configured or the content folder is empty.")));
				((ContentItemDisplayBase)this).HideContent = true;
			}
			MoreInfoControl.Visible = false;
		}
		else
		{
			((Control)(object)radPage).Visible = true;
			if (string.IsNullOrEmpty(MoreInfoControl.Text))
			{
				MoreInfoControl.Visible = false;
			}
			InfoControl.Visible = false;
			DisplayTabs(designMode, list, radTab_Top, radPage);
		}
	}

	[ExcludeFromCodeCoverage]
	private void DisplayTabs(bool designMode, List<TabbedDialogItem> currentSettings, RadTabStrip radTabControl, RadMultiPage radPageControl)
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
				((Control)(object)val4.PageView).Controls.Add(GenerateInfoPanelforTab(((ControlItem)val4).Value, currentSettings, designMode));
			}
		}
	}

	[ExcludeFromCodeCoverage]
	private static Control GenerateInfoPanelforTab(string index, IEnumerable<TabbedDialogItem> currentSettings, bool designMode)
	{
		//IL_0049: Unknown result type (might be due to invalid IL or missing references)
		//IL_004e: Unknown result type (might be due to invalid IL or missing references)
		//IL_005f: Expected O, but got Unknown
		//IL_0060: Unknown result type (might be due to invalid IL or missing references)
		//IL_0068: Unknown result type (might be due to invalid IL or missing references)
		//IL_0070: Unknown result type (might be due to invalid IL or missing references)
		//IL_0078: Unknown result type (might be due to invalid IL or missing references)
		//IL_0083: Expected O, but got Unknown
		//IL_0086: Expected O, but got Unknown
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
				if (currentSetting.Default)
				{
					label.Text += ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.DefaultTabInfo", "<br/>&#8226; This tab will be selected by default.");
				}
				((Control)(object)val2).Controls.Add(label);
				result = (Control)(object)val2;
			}
			else
			{
				PlaceHolder placeHolder = new PlaceHolder();
				Label label = new Label
				{
					Text = ResourceManager.GetPhrase("iParts.ContentCollectionOrganizer.Loading", "Loading..."),
					CssClass = "Info"
				};
				placeHolder.ID = "Pan_Page_" + index;
				placeHolder.Controls.Add(label);
				result = placeHolder;
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
	}
}
