using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Data;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.UI;
using System.Web.UI.WebControls;
using Asi.Atom;
using Asi.Business;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Business.ContentManagement.ContentType;
using Asi.Core.Performance;
using Asi.Security.Utility;
using Asi.Soa.Core.DataContracts;
using Asi.Soa.Core.ExtensionMethods;
using Asi.Soa.Core.ServiceContracts;
using Asi.Utilities;
using Asi.Web.UI;

namespace Asi.Web.iParts.Common.ContentCollectionOrganizer.Common;

public class CommonCode
{
	internal readonly char[] ItemListSep = new char[1] { '\a' };

	internal readonly char[] ItemValuesSep = new char[1] { '\n' };

	public static string VerifyFolder(string folderPathName, IDocumentService documentService)
	{
		string result = string.Empty;
		if (!string.IsNullOrEmpty(folderPathName))
		{
			try
			{
				DocumentData val = documentService.FindByPath(folderPathName);
				if (val == null || !((DocumentSummaryData)val).DocumentTypeId.Equals("CFL"))
				{
					result = string.Format(CultureInfo.CurrentCulture, ResourceManager.GetPhrase("IncorrectOrUnknownSourceFolder", "Incorrect or unknown source folder. Please verify that the folder: {0} exists and (or) you have enough permissions to access it."), folderPathName);
				}
			}
			catch (NullReferenceException ex)
			{
				result = string.Format(CultureInfo.CurrentCulture, ResourceManager.GetPhrase("UnableToLoadSourceFolder", "Unable to load source folder. Details: ") + "{0}<br/>", ex.Message);
			}
		}
		else
		{
			result = ResourceManager.GetPhrase("SelectSourceFolderToContinue", "Select source folder to continue").ToString(CultureInfo.CurrentCulture);
		}
		return result;
	}

	public static List<TabbedDialogItem> DeserializeSettings(string sourceList, IDocumentService documentService, char[] itemListSeparator, char[] itemValueSeparator, bool includeWorkingContent, bool isStaffUser)
	{
		//IL_0009: Unknown result type (might be due to invalid IL or missing references)
		//IL_000f: Expected O, but got Unknown
		List<TabbedDialogItem> list = new List<TabbedDialogItem>();
		int num = 1;
		BusinessContainer val = new BusinessContainer();
		try
		{
			URLMappingController shortcutController = URLMappingController.NewURLMappingController(val);
			List<Guid> list2 = new List<Guid>();
			if (!string.IsNullOrEmpty(sourceList))
			{
				string[] array = sourceList.Split(itemListSeparator);
				if (array.Length != 0)
				{
					string[] array2 = array;
					foreach (string text in array2)
					{
						string[] array3 = text.Split(itemValueSeparator);
						if (array3.Length < 3)
						{
							continue;
						}
						Guid guid = new Guid(array3[1].Trim());
						if ((guid == Guid.Empty || includeWorkingContent || !SecuredContentItem(guid, documentService, includeWorking: false)) && !includeWorkingContent && !isStaffUser)
						{
							continue;
						}
						TabbedDialogItem tabbedDialogItem = new TabbedDialogItem
						{
							Index = num,
							ContentItemKey = Guid.Empty,
							ContentItemName = string.Empty,
							ContentItemPath = string.Empty,
							TabCaption = string.Empty,
							Default = false,
							IsHidden = false,
							OnSuccess = 0,
							OnFail = 0
						};
						if (array3[0] == "1")
						{
							tabbedDialogItem.Default = true;
						}
						tabbedDialogItem.ContentItemKey = (Utilities.IsGuid(array3[1].Trim()) ? new Guid(array3[1].Trim()) : Guid.Empty);
						tabbedDialogItem.TabCaption = array3[2];
						list2.Add(tabbedDialogItem.ContentItemKey);
						if (array3.Length >= 6)
						{
							if (array3[3] == "1")
							{
								tabbedDialogItem.IsHidden = true;
							}
							tabbedDialogItem.OnSuccess = (int.TryParse(array3[4], out var result) ? result : 0);
							tabbedDialogItem.OnFail = (int.TryParse(array3[5], out result) ? result : 0);
						}
						if (array3.Length >= 7)
						{
							tabbedDialogItem.Shortcut = array3[6];
							if (!string.IsNullOrEmpty(tabbedDialogItem.Shortcut))
							{
								SetUpShortCut(tabbedDialogItem, shortcutController, list2);
							}
						}
						list.Add(tabbedDialogItem);
						num++;
					}
				}
			}
			if (list2.Count <= 0)
			{
				return list;
			}
			Guid[] array4 = list2.ToArray();
			string[] contentItemNames = GetContentItemNames(array4, documentService, includeWorkingContent);
			foreach (TabbedDialogItem item in list)
			{
				for (int j = 0; j < array4.Length; j++)
				{
					if (item.ContentItemKey.Equals(array4[j]))
					{
						item.ContentItemName = contentItemNames[j];
						try
						{
							item.ContentItemPath = GetContentItemPath(item.ContentItemKey, documentService, includeWorkingContent);
						}
						catch (BusinessItemLoadException)
						{
							item.ContentItemPath = null;
						}
						break;
					}
				}
			}
		}
		finally
		{
			((IDisposable)val)?.Dispose();
		}
		return list;
	}

	private static void SetUpShortCut(TabbedDialogItem item, URLMappingController shortcutController, List<Guid> contentItemKeys)
	{
		//IL_0013: Unknown result type (might be due to invalid IL or missing references)
		//IL_001d: Expected O, but got Unknown
		//IL_004a: Unknown result type (might be due to invalid IL or missing references)
		//IL_0050: Expected O, but got Unknown
		//IL_0077: Unknown result type (might be due to invalid IL or missing references)
		//IL_007c: Unknown result type (might be due to invalid IL or missing references)
		//IL_00ab: Expected O, but got Unknown
		//IL_00a5: Unknown result type (might be due to invalid IL or missing references)
		Collection<BusinessFilter> source = new Collection<BusinessFilter>
		{
			new BusinessFilter("DirectoryName", (ComparisonType)3, (object)item.Shortcut)
		};
		DataRow[] array = ((BusinessController)shortcutController).SelectWithFilter(source.ToArray(), true);
		if (array.Length == 0)
		{
			return;
		}
		URLMapping val;
		if (array.Length == 1)
		{
			val = (URLMapping)array[0];
		}
		else
		{
			? val2 = (URLMapping)array.FirstOrDefault((DataRow s) => ((URLMapping)s).WebsiteDocumentVersionKey.Equals(AppContext.CurrentContext.WebsiteKey));
			if ((int)val2 == 0)
			{
				val2 = (URLMapping)array.FirstOrDefault((DataRow s) => ((URLMapping)s).WebsiteDocumentVersionKey.Equals(Guid.Empty));
			}
			val = (URLMapping)val2;
		}
		if (val != null)
		{
			if (!string.IsNullOrEmpty(val.URLParameters))
			{
				item.UrlParameters = val.URLParameters;
			}
			if (contentItemKeys.Contains(item.ContentItemKey))
			{
				contentItemKeys.Remove(item.ContentItemKey);
			}
			item.ContentItemKey = val.TargetDocumentVersionKey;
			contentItemKeys.Add(item.ContentItemKey);
		}
	}

	internal static TabbedDialogItem GetTabItemByIndexOrName(string itemIndexOrName, List<TabbedDialogItem> currentSettings, bool honorDefault)
	{
		if (currentSettings == null)
		{
			throw new ArgumentNullException("currentSettings");
		}
		TabbedDialogItem result = new TabbedDialogItem();
		bool flag = false;
		if (int.TryParse(itemIndexOrName, NumberStyles.Integer, CultureInfo.InvariantCulture, out var _))
		{
			using IEnumerator<TabbedDialogItem> enumerator = currentSettings.Where((TabbedDialogItem tmp) => tmp.Index.ToString(CultureInfo.InvariantCulture) == itemIndexOrName).GetEnumerator();
			if (enumerator.MoveNext())
			{
				TabbedDialogItem current = enumerator.Current;
				flag = true;
				result = current;
			}
		}
		else
		{
			using IEnumerator<TabbedDialogItem> enumerator2 = currentSettings.Where((TabbedDialogItem tmp) => tmp.TabCaption.ToString(CultureInfo.InvariantCulture) == itemIndexOrName).GetEnumerator();
			if (enumerator2.MoveNext())
			{
				TabbedDialogItem current2 = enumerator2.Current;
				flag = true;
				result = current2;
			}
		}
		if (!flag)
		{
			using (IEnumerator<TabbedDialogItem> enumerator3 = currentSettings.Where((TabbedDialogItem tmp) => tmp.Index.ToString(CultureInfo.InvariantCulture) == "1").GetEnumerator())
			{
				if (enumerator3.MoveNext())
				{
					TabbedDialogItem current3 = enumerator3.Current;
					result = current3;
				}
			}
			if (honorDefault)
			{
				using IEnumerator<TabbedDialogItem> enumerator4 = currentSettings.Where((TabbedDialogItem tmp) => tmp.Default).GetEnumerator();
				if (enumerator4.MoveNext())
				{
					TabbedDialogItem current4 = enumerator4.Current;
					result = current4;
				}
			}
		}
		return result;
	}

	[ExcludeFromCodeCoverage]
	public static string GetContentItemName(Guid itemKey, IDocumentService documentService)
	{
		return GetContentItemName(itemKey, documentService, includeWorking: false);
	}

	[ExcludeFromCodeCoverage]
	public static string GetContentItemPath(Guid itemKey, IDocumentService documentService)
	{
		return GetContentItemPath(itemKey, documentService, includeWorking: false);
	}

	public static string GetContentItemName(Guid itemKey, IDocumentService documentService, bool includeWorking)
	{
		string result = string.Empty;
		if (itemKey != Guid.Empty && !includeWorking)
		{
			DocumentData val = documentService.FindByVersionId(itemKey.ToString(), (RequestedPublishingState)0);
			result = ((val != null) ? ((DocumentSummaryData)val).Name : null) ?? "";
		}
		else if (itemKey != Guid.Empty && includeWorking)
		{
			DocumentData val2 = documentService.FindByVersionId(itemKey.ToString(), (RequestedPublishingState)1);
			result = ((val2 != null) ? ((DocumentSummaryData)val2).Name : null) ?? "";
		}
		return result;
	}

	private static string[] GetContentItemNames(Guid[] itemKeys, IDocumentService documentService, bool includeWorking)
	{
		//IL_00a1: Unknown result type (might be due to invalid IL or missing references)
		//IL_00ab: Expected O, but got Unknown
		//IL_0094: Unknown result type (might be due to invalid IL or missing references)
		//IL_009e: Expected O, but got Unknown
		if (documentService != null)
		{
			string[] array = itemKeys.Select((Guid p) => p.ToString()).ToArray();
			IList<DocumentData> list = documentService.FindByVersionIds(array, (RequestedPublishingState)(includeWorking ? 1 : 0));
			string[] array2 = new string[itemKeys.Length];
			for (int num = 0; num < itemKeys.Length; num++)
			{
				array2[num] = ((list[num] != null) ? ((DocumentSummaryData)list[num]).Name : string.Empty);
			}
			return array2;
		}
		Document[] array3 = (includeWorking ? DocumentController.GetLatestVersions(itemKeys, new BusinessContainer()) : DocumentController.GetPublishedVersions(itemKeys, new BusinessContainer()));
		string[] array4 = new string[itemKeys.Length];
		for (int num2 = 0; num2 < itemKeys.Length; num2++)
		{
			array4[num2] = ((array3[num2] != null) ? array3[num2].Name : string.Empty);
		}
		return array4;
	}

	public static string GetContentItemPath(Guid itemKey, IDocumentService documentService, bool includeWorking)
	{
		string result = string.Empty;
		if (documentService != null)
		{
			if (itemKey != Guid.Empty && !includeWorking)
			{
				DocumentData val = documentService.FindByVersionId(itemKey.ToString(), (RequestedPublishingState)0);
				result = ((val != null) ? ((DocumentSummaryData)val).Path : null) ?? "";
			}
			else if (itemKey != Guid.Empty && includeWorking)
			{
				DocumentData val2 = documentService.FindByVersionId(itemKey.ToString(), (RequestedPublishingState)1);
				result = ((val2 != null) ? ((DocumentSummaryData)val2).Path : null) ?? "";
			}
		}
		else if (itemKey != Guid.Empty && !includeWorking)
		{
			Document publishedVersion = DocumentController.GetPublishedVersion(itemKey);
			result = ((publishedVersion != null) ? publishedVersion.Path : null) ?? "";
		}
		else if (itemKey != Guid.Empty && includeWorking)
		{
			Document latestVersion = DocumentController.GetLatestVersion(itemKey);
			result = ((latestVersion != null) ? latestVersion.Path : null) ?? "";
		}
		return result;
	}

	public static Control FindControlRecursive(ControlCollection controlsCollection, string controlId)
	{
		if (controlsCollection == null)
		{
			throw new ArgumentNullException("controlsCollection");
		}
		foreach (Control item in controlsCollection)
		{
			if (item.ID == controlId)
			{
				return item;
			}
			Control control2 = FindControlRecursiveHelper(item, controlId);
			if (control2 != null)
			{
				return control2;
			}
		}
		return null;
	}

	public static Collection<Control> FindControlsRecursive(Type type, ControlCollection controlsCollection, bool recursion)
	{
		if (controlsCollection == null)
		{
			throw new ArgumentNullException("controlsCollection");
		}
		Collection<Control> list = new Collection<Control>();
		foreach (Control item in controlsCollection)
		{
			if (item.GetType() == type)
			{
				list.Add(item);
			}
			else if (recursion)
			{
				FindControlsRecursiveHelper(item, type, ref list);
			}
		}
		return list;
	}

	public static Collection<Control> FindControlsRecursive(ControlCollection controlsCollection, bool recursion)
	{
		if (controlsCollection == null)
		{
			throw new ArgumentNullException("controlsCollection");
		}
		Collection<Control> list = new Collection<Control>();
		foreach (Control item in controlsCollection)
		{
			list.Add(item);
			if (recursion)
			{
				FindControlsRecursiveHelper(item, null, ref list);
			}
		}
		return list;
	}

	private static Control FindControlRecursiveHelper(Control root, string controlId)
	{
		if (root.Controls.Count != 0)
		{
			foreach (Control control3 in root.Controls)
			{
				if (control3.ID == controlId)
				{
					return control3;
				}
				if (control3.HasControls())
				{
					Control control2 = FindControlRecursiveHelper(control3, controlId);
					if (control2 != null)
					{
						return control2;
					}
				}
			}
		}
		return null;
	}

	private static void FindControlsRecursiveHelper(Control root, Type type, ref Collection<Control> list)
	{
		if (root.Controls.Count == 0)
		{
			return;
		}
		foreach (Control control in root.Controls)
		{
			if (type == null)
			{
				list.Add(control);
			}
			if (type != null && control.GetType() == type)
			{
				list.Add(control);
			}
			else if (control.HasControls())
			{
				FindControlsRecursiveHelper(control, type, ref list);
			}
		}
	}

	public static string BuildNewUrl(string originalUrl, string queryString, string urlParamValue, string urlParamName)
	{
		if (queryString == null)
		{
			throw new ArgumentNullException("queryString");
		}
		if (urlParamName == null)
		{
			throw new ArgumentNullException("urlParamName");
		}
		string[] array = queryString.Split('&');
		StringBuilder stringBuilder = new StringBuilder();
		bool flag = false;
		string[] array2 = array;
		foreach (string text in array2)
		{
			string text2;
			if (text.StartsWith("?", StringComparison.OrdinalIgnoreCase))
			{
				text2 = (text.Contains("=") ? text.Substring(1, text.IndexOf("=", StringComparison.Ordinal) - 1) : text.Substring(1));
				if (text2.Equals(urlParamName, StringComparison.OrdinalIgnoreCase))
				{
					text2 = (flag ? string.Empty : (urlParamName + "=" + urlParamValue));
					flag = true;
				}
				else
				{
					text2 = text.Substring(1);
				}
				stringBuilder.Append("?" + text2);
				continue;
			}
			text2 = (text.Contains("=") ? text.Substring(0, text.IndexOf("=", StringComparison.Ordinal)) : text);
			if (text2.Equals(urlParamName, StringComparison.OrdinalIgnoreCase))
			{
				text2 = (flag ? string.Empty : (urlParamName + "=" + urlParamValue));
				flag = true;
			}
			else
			{
				text2 = text;
			}
			if (!string.IsNullOrEmpty(text2))
			{
				stringBuilder.Append("&" + text2);
			}
		}
		if (!flag)
		{
			if (!stringBuilder.ToString().StartsWith("?", StringComparison.OrdinalIgnoreCase))
			{
				stringBuilder.Insert(0, "?");
			}
			if (stringBuilder.ToString() == "?")
			{
				stringBuilder.Append(urlParamName + "=" + urlParamValue);
			}
			else
			{
				stringBuilder.Append("&" + urlParamName + "=" + urlParamValue);
			}
		}
		return string.Format(CultureInfo.InvariantCulture, "{0}{1}", originalUrl, stringBuilder);
	}

	public static object GetEnumValueByType(Enum value, Type attributeType)
	{
		if (value == null)
		{
			throw new ArgumentNullException("value");
		}
		object result = null;
		Type type = value.GetType();
		FieldInfo field = type.GetField(value.ToString());
		object[] array;
		try
		{
			array = field.GetCustomAttributes(attributeType, inherit: true);
		}
		catch (ArgumentNullException)
		{
			array = null;
		}
		if (array != null && array.Length != 0)
		{
			result = ((!((Type)((Attribute)array[0]).TypeId == typeof(bool))) ? array[0].ToString() : ((object)(bool.TryParse(array[0].ToString(), out var result2) && result2)));
		}
		return result;
	}

	internal static bool SecuredContentItem(Guid itemKey, IDocumentService service, bool includeWorking)
	{
		if (service != null)
		{
			if (itemKey != Guid.Empty && !includeWorking)
			{
				DocumentData val = service.FindByVersionId(itemKey.ToString(), (RequestedPublishingState)0);
				return val != null;
			}
			if (itemKey != Guid.Empty && includeWorking)
			{
				DocumentData val2 = service.FindByVersionId(itemKey.ToString(), (RequestedPublishingState)1);
				return val2 != null;
			}
		}
		else
		{
			if (itemKey != Guid.Empty && !includeWorking)
			{
				Document publishedVersion = DocumentController.GetPublishedVersion(itemKey);
				return publishedVersion != null;
			}
			if (itemKey != Guid.Empty && includeWorking)
			{
				Document latestVersion = DocumentController.GetLatestVersion(itemKey);
				return latestVersion != null;
			}
		}
		return false;
	}

	public static void RenderContentRecordDisplay(Guid currentControlKey, Control resultsPanel, BusinessContainer businessContainer, Page currentPage)
	{
		//IL_00c3: Unknown result type (might be due to invalid IL or missing references)
		//IL_00ca: Expected O, but got Unknown
		if (resultsPanel == null)
		{
			throw new ArgumentNullException("resultsPanel");
		}
		bool useDefaultLayout = false;
		try
		{
			if (!(currentControlKey != Guid.Empty) || resultsPanel.Controls.Count != 0)
			{
				return;
			}
			CacheManager.Instance.InvalidateCache(currentControlKey.ToString(), (string)null, (InvalidateCacheOptions)0);
			Document cachedDocument = ContentRecordPage.GetCachedDocument(currentControlKey, businessContainer, 1);
			Content val = null;
			if (cachedDocument != null)
			{
				val = Content.GetFromDocument(cachedDocument);
			}
			ContentLayout val2 = ((val != null) ? val.ContentLayout : null);
			if (((val2 != null) ? val2.LayoutMarkup : null) == null)
			{
				if (businessContainer == null && val != null)
				{
					businessContainer = ((AtomBaseSerializationNeutral)val).BusinessContainer;
				}
				else if (businessContainer == null)
				{
					businessContainer = new BusinessContainer();
				}
				val2 = ContentLayout.GetDefaultLayout(businessContainer);
				useDefaultLayout = true;
			}
			RenderContentRecordParseLayout(resultsPanel, val2, useDefaultLayout);
			RenderContentRecordAddContentItemsToLayout(resultsPanel, val, val2, currentPage);
		}
		catch (BusinessItemLoadException)
		{
			resultsPanel.Controls.Add(new LiteralControl("<div class='iPartRenderError'>There was a problem loading this area</div>"));
		}
	}

	private static void RenderContentRecordParseLayout(Control resultsPanel, ContentLayout contentRecordLayout, bool useDefaultLayout)
	{
		string layoutMarkup;
		MatchCollection matchCollection;
		if (useDefaultLayout)
		{
			layoutMarkup = contentRecordLayout.LayoutMarkup;
			matchCollection = Regex.Matches(layoutMarkup, "(\\{)([0-9]+)(\\})", RegexOptions.IgnoreCase);
			StringBuilder stringBuilder = new StringBuilder();
			foreach (Match item in matchCollection)
			{
				stringBuilder.Append("<span>" + layoutMarkup.Substring(item.Index, item.Length) + "</span>");
			}
			layoutMarkup = stringBuilder.ToString();
		}
		else
		{
			layoutMarkup = contentRecordLayout.LayoutMarkup;
		}
		layoutMarkup = string.Format(CultureInfo.InvariantCulture, "<div class=\"ContentWizardDisplay ClearFix\">{0}</div>", layoutMarkup.Trim());
		matchCollection = Regex.Matches(layoutMarkup, "(\\{)([0-9]+)(\\})", RegexOptions.IgnoreCase);
		int num = 0;
		foreach (Match item2 in matchCollection)
		{
			Literal child = new Literal
			{
				Text = layoutMarkup.Substring(num, item2.Index - num)
			};
			resultsPanel.Controls.Add(child);
			if (!int.TryParse(layoutMarkup.Substring(item2.Index + 1, item2.Length - 2), out var result))
			{
				result = 0;
			}
			Panel child2 = new Panel
			{
				ID = "Zone" + result + "PlaceHolder"
			};
			resultsPanel.Controls.Add(child2);
			num = item2.Index + item2.Length;
		}
		if (num < layoutMarkup.Length)
		{
			Literal child = new Literal
			{
				Text = layoutMarkup.Substring(num, layoutMarkup.Length - num)
			};
			resultsPanel.Controls.Add(child);
		}
	}

	private static void RenderContentRecordAddContentItemsToLayout(Control resultsPanel, Content contentRecord, ContentLayout contentRecordLayout, Page currentPage)
	{
		RenderContentRecordAddContentItemsToLayout(resultsPanel, contentRecord, contentRecordLayout, returnOnlyList: false, currentPage);
	}

	private static List<Control> RenderContentRecordAddContentItemsToLayout(Control resultsPanel, Content contentRecord, ContentLayout contentRecordLayout, bool returnOnlyList, Page currentPage)
	{
		//IL_001f: Unknown result type (might be due to invalid IL or missing references)
		//IL_0025: Expected O, but got Unknown
		//IL_0187: Unknown result type (might be due to invalid IL or missing references)
		//IL_018e: Expected O, but got Unknown
		//IL_035d: Unknown result type (might be due to invalid IL or missing references)
		//IL_0367: Expected O, but got Unknown
		//IL_0346: Unknown result type (might be due to invalid IL or missing references)
		//IL_0352: Expected O, but got Unknown
		//IL_02cb: Unknown result type (might be due to invalid IL or missing references)
		//IL_02d5: Expected O, but got Unknown
		//IL_02b2: Unknown result type (might be due to invalid IL or missing references)
		//IL_02be: Expected O, but got Unknown
		List<Control> list = new List<Control>();
		foreach (ContentLayoutZone item in (CollectionBase)(object)contentRecordLayout.Zones)
		{
			ContentLayoutZone val = item;
			Panel panel = (Panel)resultsPanel.FindControl("Zone" + val.ZoneNumber + "PlaceHolder");
			if (!(panel != null || returnOnlyList))
			{
				continue;
			}
			if (!returnOnlyList)
			{
				string text;
				string text2;
				string text3;
				if (contentRecord != null && (SecurityHelper.IsAuthenticatedUser || (!SecurityHelper.IsAuthenticatedUser && !contentRecord.IsMemberOnly && !contentRecord.RequireAuthenticatedUser)))
				{
					text = (contentRecord.LayoutZoneProperties.ContainsKey(val.ZoneNumber + "_Title") ? contentRecord.LayoutZoneProperties[val.ZoneNumber + "_Title"] : string.Empty);
					text2 = (contentRecord.LayoutZoneProperties.ContainsKey(val.ZoneNumber + "_CssClass") ? contentRecord.LayoutZoneProperties[val.ZoneNumber + "_CssClass"] : string.Empty);
					text3 = (contentRecord.LayoutZoneProperties.ContainsKey(val.ZoneNumber + "_TitleCssClass") ? contentRecord.LayoutZoneProperties[val.ZoneNumber + "_TitleCssClass"] : string.Empty);
				}
				else
				{
					contentRecord = new Content();
					text = ResourceManager.GetPhrase("Unauthorized Access", "You do not have permission to view this content.");
					text2 = "AsiError";
					text3 = string.Empty;
				}
				if (!string.IsNullOrEmpty(text))
				{
					Panel panel2 = new Panel();
					if (!string.IsNullOrEmpty(text3))
					{
						panel2.CssClass = text3;
					}
					panel2.Controls.Add(new Label
					{
						Text = text
					});
					panel.Controls.Add(panel2);
				}
				if (!text2.Equals("AsiError", StringComparison.OrdinalIgnoreCase))
				{
					panel.CssClass = "WebPartZone";
				}
				if (!string.IsNullOrEmpty(text2))
				{
					panel.CssClass += string.Format(CultureInfo.InvariantCulture, " {0}", text2);
				}
			}
			if (contentRecord == null)
			{
				continue;
			}
			foreach (ContentItem item2 in (ModifiedCollection<ContentItem>)(object)contentRecord.GetItemsInZone(val.ZoneNumber))
			{
				if (!returnOnlyList)
				{
					Control control = ((currentPage == null) ? item2.ContentRenderer.RenderForRuntime(item2, new ContentParameterCollection()) : item2.ContentRenderer.RenderForRuntime(item2, new ContentParameterCollection(), currentPage));
					panel.Controls.Add(control);
					Panel panel3 = new Panel
					{
						ID = "ControlErrorPanel_" + control.ID,
						CssClass = "Error"
					};
					panel3.Style.Add("Display", "None");
					panel.Controls.Add(panel3);
				}
				else
				{
					list.Add((currentPage == null) ? item2.ContentRenderer.RenderForRuntime(item2, new ContentParameterCollection()) : item2.ContentRenderer.RenderForRuntime(item2, new ContentParameterCollection(), currentPage));
				}
			}
		}
		list.Sort(CompareControlsCommitSequence);
		return list;
	}

	private static int CompareControlsCommitSequence(Control first, Control second)
	{
		IUserControl val = (IUserControl)(object)((first is IUserControl) ? first : null);
		IUserControl val2 = (IUserControl)(object)((second is IUserControl) ? second : null);
		if (val != null && val2 != null)
		{
			if (val.CommitSequence == 0)
			{
				return 1;
			}
			if (val2.CommitSequence == 0)
			{
				return -1;
			}
			return val.CommitSequence - val2.CommitSequence;
		}
		if (val == null && val2 != null)
		{
			return 1;
		}
		if (val != null)
		{
			return -1;
		}
		return 0;
	}

	public static List<Control> GetContentRecordItems(Guid currentControlKey)
	{
		List<Control> result = new List<Control>();
		bool useDefaultLayout = false;
		if (currentControlKey != Guid.Empty)
		{
			PlaceHolder placeHolder = new PlaceHolder
			{
				ID = "ph_" + currentControlKey
			};
			if (currentControlKey != Guid.Empty && placeHolder.Controls.Count == 0)
			{
				Content fromContentKey = Content.GetFromContentKey(currentControlKey);
				ContentLayout val = fromContentKey.ContentLayout;
				if (string.IsNullOrEmpty((val != null) ? val.LayoutMarkup : null))
				{
					val = ContentLayout.GetDefaultLayout(((AtomBaseSerializationNeutral)fromContentKey).BusinessContainer);
					useDefaultLayout = true;
				}
				RenderContentRecordParseLayout(placeHolder, val, useDefaultLayout);
				result = RenderContentRecordAddContentItemsToLayout(placeHolder, fromContentKey, val, returnOnlyList: true, null);
			}
		}
		return result;
	}

	internal static bool GetCurrentStepPosition(string stepIndex, List<TabbedDialogItem> currentSettings, bool needFirst)
	{
		if (currentSettings == null)
		{
			throw new ArgumentNullException("currentSettings");
		}
		bool result = false;
		if (!int.TryParse(stepIndex, out var result2))
		{
			result2 = 0;
		}
		int num = 0;
		int num2 = 0;
		foreach (TabbedDialogItem currentSetting in currentSettings)
		{
			if (!currentSetting.IsHidden && num == 0)
			{
				num = currentSetting.Index;
			}
			if (!currentSetting.IsHidden)
			{
				num2 = currentSetting.Index;
			}
		}
		if (needFirst)
		{
			if (result2 == num)
			{
				result = true;
			}
		}
		else if (result2 == num2)
		{
			result = true;
		}
		return result;
	}

	internal static int GetCurrentFixedStepNumber(TabbedDialogItem currentStep, List<TabbedDialogItem> currentSettings)
	{
		if (currentSettings == null)
		{
			throw new ArgumentNullException("currentSettings");
		}
		return (currentSettings.Count != 0) ? (1 + currentSettings.TakeWhile((TabbedDialogItem tmp) => tmp.Index != currentStep.Index).Count((TabbedDialogItem tmp) => !tmp.IsHidden && tmp.Index != currentStep.Index)) : 0;
	}

	internal static int GetTotalStepsCount(List<TabbedDialogItem> currentSettings)
	{
		if (currentSettings == null)
		{
			throw new ArgumentNullException("currentSettings");
		}
		return (currentSettings.Count != 0) ? currentSettings.Count((TabbedDialogItem tmp) => !tmp.IsHidden) : 0;
	}

	private static IList<DocumentData> GetFolderContent(Guid folderKey, IDocumentService documentService)
	{
		IList<DocumentData> source = documentService.FindDescendantDocumentsInFolder(folderKey.ToString(), "CON", true);
		return source.OrderBy((DocumentData x) => (x != null) ? ((DocumentSummaryData)x).Name : string.Empty).ToList();
	}

	public static string GenerateDynamicTabSettings(Guid sourceKey, Guid defaultSourceKey, IDocumentService documentService)
	{
		if (sourceKey.Equals(Guid.Empty) && defaultSourceKey.Equals(Guid.Empty))
		{
			return string.Empty;
		}
		List<TabbedDialogItem> list = new List<TabbedDialogItem>();
		IList<DocumentData> list2 = new List<DocumentData>();
		bool flag = true;
		if (!sourceKey.Equals(Guid.Empty))
		{
			list2 = GetFolderContent(sourceKey, documentService);
			if (list2.Count > 0)
			{
				flag = false;
			}
		}
		if (!defaultSourceKey.Equals(Guid.Empty) && flag)
		{
			list2 = GetFolderContent(defaultSourceKey, documentService);
		}
		if (list2.Count <= 0)
		{
			return string.Empty;
		}
		foreach (DocumentData item2 in list2)
		{
			TabbedDialogItem item = new TabbedDialogItem
			{
				TabCaption = ((DocumentSummaryData)item2).AlternateName,
				ContentItemKey = GeneralExtensionMethods.ToGuid(((DocumentSummaryData)item2).DocumentVersionId),
				ContentItemName = ((DocumentSummaryData)item2).Name,
				Default = false,
				IsHidden = false
			};
			list.Add(item);
		}
		if (list.Count > 0)
		{
			list[0].Default = true;
		}
		StringBuilder stringBuilder = new StringBuilder();
		CommonCode commonCode = new CommonCode();
		foreach (TabbedDialogItem item3 in list)
		{
			if (item3.Default)
			{
				stringBuilder.Append("1" + commonCode.ItemValuesSep[0]);
			}
			else
			{
				stringBuilder.Append("0" + commonCode.ItemValuesSep[0]);
			}
			stringBuilder.Append(item3.ContentItemKey.ToString() + commonCode.ItemValuesSep[0]);
			stringBuilder.Append(item3.TabCaption + commonCode.ItemValuesSep[0]);
			if (item3.IsHidden)
			{
				stringBuilder.Append("1" + commonCode.ItemValuesSep[0]);
			}
			else
			{
				stringBuilder.Append("0" + commonCode.ItemValuesSep[0]);
			}
			stringBuilder.Append(item3.OnSuccess.ToString(CultureInfo.InvariantCulture) + commonCode.ItemListSep[0]);
		}
		return stringBuilder.ToString();
	}
}
