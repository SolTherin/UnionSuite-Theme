<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="DynamicContentCollectionOrganizerDisplay.ascx.cs" Inherits="Asi.Web.iParts.Common.ContentCollectionOrganizer.DynamicContentCollectionOrganizerDisplay" %>
<%@ Register TagPrefix="telerik" Namespace="Telerik.Web.UI" Assembly="Telerik.Web.UI" %>

<asp:Literal ID="TabPanelAnchor" runat="server" Visible="False" />  
<asp:Label CssClass="PanelFieldValue AsiWarning" ID="InfoControl" runat="server" Visible="false" />       
<asp:Label CssClass="PanelFieldValue AsiInformation" id="MoreInfoControl" runat="server" Visible="false" />
                 
<asp:Panel ID="MainContentControl" runat="server">            
    <telerik:RadTabStrip AutoPostBack="false" CausesValidation="false" EnableViewState="true" ID="radTab_Top" MultiPageID="radPage" runat="server" ScrollButtonsPosition="Middle" ScrollChildren="false" SelectedIndex="0" translate="yes" />             
    <telerik:RadMultiPage ID="radPage" runat="server" SelectedIndex="0" />            
    <asp:UpdatePanel ChildrenAsTriggers="true" ID="updatePanel" runat="server" translate="yes" UpdateMode="Conditional">  
        <ContentTemplate>
            <asp:Button id="refreshTrigger" OnClick="RefreshTriggerClick" runat="server" style="display:none" Text=""></asp:Button>
        </ContentTemplate>     
    </asp:UpdatePanel>  
    <script type="text/javascript"  >
        if (Telerik.Web.UI.RadGrid != null)
            Telerik.Web.UI.RadGrid.prototype._detachDomEvents = function () {
                if (this._events) {
                    if (this._onKeyDownDelegate) {
                        $removeHandler(this.get_element(), "keydown", this._onKeyDownDelegate);
                        this._onKeyDownDelegate = null;
                    }
                    if (this._onKeyPressDelegate) {
                        $removeHandler(this.get_element(), "keypress", this._onKeyPressDelegate);
                        this._onKeyPressDelegate = null;
                    }
                    if (this._onMouseMoveDelegate) {
                        $removeHandler(this.get_element(), "mousemove", this._onMouseMoveDelegate);
                        this._onMouseMoveDelegate = null;
                    }
                }
            }
    </script>
</asp:Panel>
        
<asp:Panel ID="panStep" runat="server" EnableViewState="true"/>
<asp:Label ID="debug" runat="server"/>