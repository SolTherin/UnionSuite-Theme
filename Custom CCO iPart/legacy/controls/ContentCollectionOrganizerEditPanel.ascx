<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="ContentCollectionOrganizerEditPanel.ascx.cs"
    Inherits="Asi.Web.iParts.Common.ContentCollectionOrganizer.ContentCollectionOrganizerEditPanel" %>
<%@ Register Namespace="Asi.Web.UI.WebControls" TagPrefix="asiweb" Assembly="Asi.Web" %>
<asiweb:PanelTemplateControl2 ID="Panel1" runat="server" Collapsible="false" FieldSet="true" ShowBorder="False">
    <%--Display table--%>
    <div id="fieldsRow_0" runat="server" class="PanelField Left">
        <label>Tab</label>
        <div class="PanelFieldValue">        
            <asp:LinkButton ID="MoveLeft" runat="server"  OnClick="MoveTabLink_Click"/>
            <asp:LinkButton ID="MoveRight" runat="server" OnClick="MoveTabLink_Click"/> 
            <asp:LinkButton ID="RemoveTabLink" runat="server" OnClick="RemoveTabLink_Click"/>
        </div>
    </div>
    <%--First row: caption label, caption text, default tab and remove button--%>
    <div class="PanelField Left">
        <asiweb:BusinessLabel CssClass="Required" ID="tabNameLabel" runat="server" AssociatedControlID="TabNameControl" />
        <div class="PanelFieldValue">
            <asiweb:BusinessTextBox ID="TabNameControl" runat="server" />
            <asp:CustomValidator ID="ValidatorTabName" runat="server" ControlToValidate="TabNameControl"
                Display="Dynamic" ClientValidationFunction="ValidateTabName" EnableClientScript="true"
                ValidateEmptyText="true" SetFocusOnError="false">
            </asp:CustomValidator>
        </div>
    </div>
    <div runat="server" id="defaultTabPanel" class="PanelField Right AutoWidth">
        <div class="PanelFieldValue">
            <asp:CheckBox ID="DefaultTab" runat="server"/>
        </div>
        <asiweb:BusinessLabel ID="DefaultTabCaption" runat="server" AssociatedControlID="DefaultTab" />
    </div>

    <%--Second row - content item to display--%>
    <div class="PanelField" style="white-space:nowrap;">
        <asiweb:BusinessLabel ID="ContentItemLabel" runat="server" AssociatedControlID="ContentItemControl" />
        <div class="PanelFieldValue">
            <div style="white-space:nowrap; display:inline-block;">
                <asiweb:BusinessTextBox ID="ContentItemControl" runat="server" AutoPostBack="true"
                    CausesValidation="true" CssClass="InputXLarge" />                                           
                <asp:LinkButton ID="SelectContentItemLink" runat="server" />                
                <asp:LinkButton ID="PreviewContentLink" runat="server"/>           
                <span style="display:block;"> 
                    <asp:CustomValidator ID="ContentItemControlValidator" runat="server" ControlToValidate="ContentItemControl" 
                        Display="Dynamic" ValidateEmptyText="true" OnServerValidate="ValidateContentItemEntry_Validation">
                    </asp:CustomValidator>        
                </span>                 
                <asp:HiddenField ID="ContentKey" runat="server" />
                <asp:HiddenField ID="ContentShortcut" runat="server" />
                <asp:Button ID="HiddenRefresher" runat="server" Style="display:none" CausesValidation="true" />
            </div>
        </div>
    </div>
    <div style="clear: both;"></div>
    <%--Third row - hidden step--%>
    <div id="fieldsRow_3" runat="server" class="PanelField Right AutoWidth">
        <div class="PanelFieldValue">
            <asp:CheckBox ID="HiddenCheckBox" runat="server" />
        </div>
        <asiweb:BusinessLabel ID="HiddenCheckBoxLabel" runat="server" AssociatedControlID="HiddenCheckBox" />
    </div>
    <%--Fourth row: next step on success label and drop down list--%>
    <div id="fieldsRow_4" runat="server" class="PanelField Left">
        <asiweb:BusinessLabel ID="NextSuccessStepLabel" runat="server" AssociatedControlID="SuccessStepsList" />
        <div class="PanelFieldValue">
            <asp:DropDownList ID="SuccessStepsList" runat="server" />
        </div>
    </div>
    <div style="clear: both;"></div>
    <%--Fifth row: nest step on success label and drop down list--%>
    <div id="fieldsRow_5" runat="server" class="PanelField Left">
        <asiweb:BusinessLabel ID="NextFailStepLabel" runat="server" AssociatedControlID="FailStepsList" />
        <div class="PanelFieldValue">
            <asp:DropDownList ID="FailStepsList" runat="server" />
        </div>
    </div>
</asiweb:PanelTemplateControl2>
<div style="clear: both;"></div>