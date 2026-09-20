<%@ Control Language="C#" AutoEventWireup="True" CodeBehind="ContentCollectionOrganizerDisplay.ascx.cs" Inherits="Asi.Web.iParts.Common.ContentCollectionOrganizer.ContentCollectionOrganizerDisplay" %>
<%@ Register TagPrefix="telerik" Namespace="Telerik.Web.UI" Assembly="Telerik.Web.UI" %>

<asp:Literal ID="TabPanelAnchor" runat="server" Visible="False" />   
<asp:Label CssClass="PanelFieldValue AsiWarning" ID="InfoControl" runat="server" Visible="False" /> 
<asp:Label CssClass="PanelFieldValue AsiInformation" id="MoreInfoControl" runat="server" Visible="false" />

<asp:Panel ID="MainContentControl" runat="server">           
    <telerik:RadTabStrip AutoPostBack="False" CausesValidation="False" EnableViewState="True" ID="radTab_Top" MultiPageID="radPage" runat="server" ScrollButtonsPosition="Middle" ScrollChildren="False" SelectedIndex="0" />   
    <telerik:RadMultiPage ID="radPage" runat="server" SelectedIndex="0" />    
    <telerik:RadTabStrip AutoPostBack="False" CausesValidation="False" EnableViewState="True" ID="radTab_Bottom" MultiPageID="radPage" runat="server" ScrollButtonsPosition="Middle" ScrollChildren="False" SelectedIndex="0" />   
    <asp:UpdatePanel ID="updatePanel" runat="server" ChildrenAsTriggers="True" UpdateMode="Conditional">
        <ContentTemplate>
            <asp:Button id="refreshTrigger" OnClick="RefreshTriggerClick" runat="server" style="display:none" Text="Refresh" />
        </ContentTemplate>      
    </asp:UpdatePanel>                            
</asp:Panel>
        
<asp:Panel ID="panStep" runat="server" EnableViewState="true"/>
<asp:Label ID="debug" runat="server"/> 