using System;
using System.Diagnostics.CodeAnalysis;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using Asi.Business.ContentManagement;
using Asi.Web.UI;
using Asi.Web.UI.WebControls;

namespace Asi.Web.iParts.Website.ContentDisplay;

public class ContentDisplayControl : WebsiteiPartDisplayBase
{
	protected HtmlGenericControl ContentDisplayPlaceholder;

	protected Label ContentNameLabel;

	protected ContentTemplateArea ContentRecordTemplateArea;

	protected override void OnPreRender(EventArgs e)
	{
		((WebsiteiPartDisplayBase)this).OnPreRender(e);
		if (((WebsiteiPartDisplayBase)this).DoNotRenderInDesignMode && ((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			((ContentItemDisplayBase)this).HideContent = true;
		}
		else
		{
			((ContentItemDisplayBase)this).HideContent = false;
		}
	}

	[ExcludeFromCodeCoverage]
	protected override void OnLoad(EventArgs e)
	{
		((WebsiteiPartDisplayBase)this).OnLoad(e);
		if (((ContentItemDisplayBase)this).IsContentDesignMode)
		{
			ContentDisplayPlaceholder.Visible = true;
			ContentNameLabel.Text = "Content";
			if (((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).ContentRecordDocument != null)
			{
				ContentNameLabel.Text = ((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).ContentRecordDocument.ContentTitle;
			}
			return;
		}
		Page page = ((Control)(object)this).Page;
		DisplayPageBase val = (DisplayPageBase)(object)((page is DisplayPageBase) ? page : null);
		if (val != null)
		{
			if (((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).DisplayOn.Equals("Homepage") && val.IsHomePage)
			{
				GetContentRecord();
			}
			else if (((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).DisplayOn.Equals("Interior") && !val.IsHomePage)
			{
				GetContentRecord();
			}
			else if (((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).DisplayOn.Equals("All"))
			{
				GetContentRecord();
			}
		}
	}

	[ExcludeFromCodeCoverage]
	private void GetContentRecord()
	{
		if (((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).ContentRecordDocument != null)
		{
			ContentRecordTemplateArea.DocumentVersionKey = ((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).ContentRecordDocument.ContentKey;
			ContentRecordTemplateArea.HonorContentRecordLayout = ((ContentDisplayCommon)(object)((ContentItemDisplayBase)this).ContentItem).HonorContentRecordLayout;
		}
	}

	public override ContentItem CreateContentItem()
	{
		ContentDisplayCommon contentDisplayCommon = new ContentDisplayCommon();
		((ContentItem)contentDisplayCommon).ContentItemKey = ((ContentItemDisplayBase)this).ContentItemKey;
		return (ContentItem)(object)contentDisplayCommon;
	}
}
