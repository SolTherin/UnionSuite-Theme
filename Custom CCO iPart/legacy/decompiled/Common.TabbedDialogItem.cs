using System;

namespace Asi.Web.iParts.Common.ContentCollectionOrganizer.Common;

[Serializable]
public class TabbedDialogItem : IComparable
{
	public int Index { get; set; }

	public bool Default { get; set; }

	public Guid ContentItemKey { get; set; }

	public string ContentItemName { get; set; }

	public string ContentItemPath { get; set; }

	public string TabCaption { get; set; }

	public string Shortcut { get; set; }

	public string UrlParameters { get; set; }

	public bool IsHidden { get; set; }

	public int OnSuccess { get; set; }

	public int OnFail { get; set; }

	public int CompareTo(object obj)
	{
		if (!(obj is TabbedDialogItem tabbedDialogItem))
		{
			throw new InvalidCastException("This object is not of type TabbedDialogItem");
		}
		return Index.CompareTo(tabbedDialogItem.Index);
	}
}
