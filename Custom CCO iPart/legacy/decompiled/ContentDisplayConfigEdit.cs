using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Web.UI;
using Asi.Business.Common;
using Asi.Web.UI;
using Asi.Web.UI.WebControls;

namespace Asi.Web.iParts.Website.ContentDisplay;

public class ContentDisplayConfigEdit : iPartEditBase
{
	protected SmartControl ContentRecordPath;

	protected SmartControl DisplayOn;

	protected SmartControl HonorContentRecordLayout;

	public override string AtomComponentName => "Content Display";

	protected override void OnInit(EventArgs e)
	{
		HideConfigurationProperties();
		((ContentItemEditBase)this).OnInit(e);
	}

	[ExcludeFromCodeCoverage]
	protected override void OnLoad(EventArgs e)
	{
		//IL_003f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0049: Expected O, but got Unknown
		((iPartEditBase)this).OnLoad(e);
		if (!string.IsNullOrEmpty(ContentRecordPath.Text))
		{
			string text = ContentDisplayCommon.VerifyContent(ContentRecordPath.Text);
			if (!string.IsNullOrEmpty(text))
			{
				((UserControlBase)this).AddUserMessage(new UserControlMessage((UserControlMessageTypes)4, text));
			}
		}
	}

	[ExcludeFromCodeCoverage]
	public override void PreCommit(PreCommitArgs e)
	{
		if (e == null)
		{
			throw new ArgumentNullException("e");
		}
		((AtomPanelBase)this).PreCommit(e);
		((UserControlBase)this).EnsureAtomObject();
		if (!string.IsNullOrEmpty(ContentRecordPath.Text))
		{
			Document val = DocumentController.Document(ContentRecordPath.Text);
			if (val != null && val.DocumentTypeCode.Equals("CON"))
			{
				((ContentDisplayCommon)(object)((ContentItemEditBase)this).ContentItem).ContentRecordKey = val.DocumentVersionKey;
				((ContentDisplayCommon)(object)((ContentItemEditBase)this).ContentItem).ContentRecordPath = val.Path;
				((ContentDisplayCommon)(object)((ContentItemEditBase)this).ContentItem).DisplayOn = DisplayOn.Value.ToString();
				((ContentDisplayCommon)(object)((ContentItemEditBase)this).ContentItem).HonorContentRecordLayout = (bool)HonorContentRecordLayout.Value;
			}
		}
	}

	[ExcludeFromCodeCoverage]
	private void HideConfigurationProperties()
	{
		if (((iPartEditBase)this).HiddenConfigurationOptions == null)
		{
			((iPartEditBase)this).HiddenConfigurationOptions = new List<HideConfiguration>();
		}
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)0);
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)3);
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)4);
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)5);
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)6);
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)7);
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)8);
		((iPartEditBase)this).HiddenConfigurationOptions.Add((HideConfiguration)1);
		((Control)(object)this).EnsureChildControls();
	}
}
