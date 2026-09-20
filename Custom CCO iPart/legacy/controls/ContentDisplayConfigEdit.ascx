<%@ Control Language="C#" AutoEventWireup="true" CodeBehind="ContentDisplayConfigEdit.ascx.cs" Inherits="Asi.Web.iParts.Website.ContentDisplay.ContentDisplayConfigEdit" %>
<%@ Register TagPrefix="asiweb" Namespace="Asi.Web.UI.WebControls" Assembly="Asi.Web" %>
<asiweb:SmartControl 
    ID="ContentRecordPath" runat="server" 
    BoundPropertyName="ContentRecordPath" DisplayCaption="true" 
    PositionCaption="Left" DataSaveUponStateChange="false" InputFieldCssClass="InputXLargeWrapper" AutoPostBack="True" />
<asiweb:SmartControl 
    ID="DisplayOn" runat="server" 
    BoundPropertyName="DisplayOn" DisplayCaption="true" 
    PositionCaption="Left" DataSaveUponStateChange="false" InputFieldCssClass="AutoWidth" />
<asiweb:SmartControl 
    ID="HonorContentRecordLayout" runat="server" 
    BoundPropertyName="HonorContentRecordLayout" DisplayCaption="true" 
    PositionCaption="Right" DataSaveUponStateChange="false" />