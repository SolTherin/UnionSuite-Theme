<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="ContentDisplayControl.ascx.cs" Inherits="Asi.Web.iParts.Website.ContentDisplay.ContentDisplayControl" %>
<%@ Register TagPrefix="asiweb" Namespace="Asi.Web.UI.WebControls" Assembly="Asi.Web" %>
<div id="ContentDisplayPlaceholder" class="ContentDisplayPlaceholder EditModePlaceholder" runat="server" Visible="false">    
    <div class="ContentDisplayPlaceholderInner EditModePlaceholderInner"><asp:Label runat="server" id="ContentNameLabel"></asp:Label></div>
</div>

<asiweb:ContentTemplateArea ID="ContentRecordTemplateArea" runat="server" /> 	 
