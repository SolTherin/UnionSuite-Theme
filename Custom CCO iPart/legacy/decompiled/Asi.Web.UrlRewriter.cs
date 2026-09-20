using System;
using System.Configuration;
using System.Data;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using System.Web;
using System.Web.Security;
using Asi.Atom;
using Asi.Business;
using Asi.Business.Common;
using Asi.Business.ContentManagement;
using Asi.Security;

namespace Asi.Web;

[ComVisible(false)]
[ExcludeFromCodeCoverage]
public class UrlRewriter : BaseUrlRewriter
{
	private string lastRequestKey = " ";

	private int lastRequestKeyCount = 0;

	private string GetRequestKey(string requestPath, HttpApplication app)
	{
		if (app == null || string.IsNullOrEmpty(app.Request.UserHostAddress))
		{
			return requestPath;
		}
		return $"{requestPath}:{app.Request.UserHostAddress}";
	}

	protected override void Rewrite(string requestedPath, HttpApplication app)
	{
		//IL_03cc: Unknown result type (might be due to invalid IL or missing references)
		//IL_03d3: Invalid comparison between Unknown and I4
		string text = requestedPath;
		string requestKey = GetRequestKey(requestedPath, app);
		if (lastRequestKey.Equals(requestKey))
		{
			if (lastRequestKeyCount++ >= 10)
			{
				lastRequestKey = " ";
				lastRequestKeyCount = 0;
				BaseUrlRewriter.RewriteUrl(app.Context, "~/Error.aspx?errorpath=" + requestedPath);
				return;
			}
		}
		else
		{
			lastRequestKey = requestKey;
			lastRequestKeyCount = 0;
		}
		string appDomainAppVirtualPath = HttpRuntime.AppDomainAppVirtualPath;
		if (requestedPath.StartsWith(appDomainAppVirtualPath + "/api/", StringComparison.OrdinalIgnoreCase) || requestedPath.StartsWith(appDomainAppVirtualPath + "/token/", StringComparison.OrdinalIgnoreCase) || requestedPath.StartsWith(HttpRuntime.AppDomainAppVirtualPath + "/ERROR.ASPX", StringComparison.OrdinalIgnoreCase) || requestedPath.StartsWith(HttpRuntime.AppDomainAppVirtualPath + "/ASICOMMON/CONTROLS/SHARED/FORMSAUTHENTICATION/LOGIN.ASPX", StringComparison.OrdinalIgnoreCase) || requestedPath.StartsWith(HttpRuntime.AppDomainAppVirtualPath + "/api/", StringComparison.OrdinalIgnoreCase) || requestedPath.EndsWith(".ASHX", StringComparison.OrdinalIgnoreCase) || requestedPath.EndsWith("TELERIK.WEB.UI.DIALOGHANDLER.ASPX", StringComparison.OrdinalIgnoreCase) || requestedPath.EndsWith(".REM", StringComparison.OrdinalIgnoreCase) || requestedPath.EndsWith("FAVICON.ICO", StringComparison.OrdinalIgnoreCase))
		{
			return;
		}
		ImpersonationInformation val = SecurityContext.Impersonate("MANAGER");
		try
		{
			Website val2 = null;
			string text2 = null;
			User val3 = null;
			if (val.ActualPrincipal != null && val.ActualPrincipal.Identity != null && val.ActualPrincipal.Identity.IsAuthenticated)
			{
				val3 = UserController.User(val.ActualPrincipal.Identity.Name, Website.StaticBusinessContainer);
			}
			bool flag = string.IsNullOrEmpty(app.Request.QueryString["PreviewMode"]) || !bool.Parse(app.Request.QueryString["PreviewMode"]);
			if (!flag)
			{
				flag = true;
				if (val3 == null)
				{
					val2 = FindWebsite(app, app.Request, Website.StaticBusinessContainer, publishedOnly: true);
					text2 = ((val2 == null) ? string.Empty : ("&WebsiteKey=" + val2.WebsiteKey.ToString()));
					BaseUrlRewriter.RewriteUrl(app.Context, FormsAuthentication.LoginUrl + "?ReturnUrl=" + app.Server.UrlEncode(requestedPath) + text2 + string.Format(CultureInfo.InvariantCulture, "&LoginMessage={0}", app.Server.UrlEncode(ResourceManager.GetPhrase("WebsiteAuthenticationRequiredForPreview", "You must log in to preview this website."))));
					return;
				}
				DataSet privileges = ContentManagerAuthorityGroup.GetPrivileges(val3.UserKey);
				if (ContentManagerAuthorityGroup.HasCMPrivilege(privileges, "Navigation Creator") || ContentManagerAuthorityGroup.HasCMPrivilege(privileges, "Navigation Editor"))
				{
					flag = false;
					app.Context.Items["PreviewMode"] = true;
				}
			}
			SiteMapProviderBase siteMapProviderBase = ((HttpContext.Current == null || HttpContext.Current.Items["PreviewMode"] == null || !(bool)HttpContext.Current.Items["PreviewMode"]) ? SiteMapProviderBase.SiteMapProvider : SiteMapProviderBase.PreviewSiteMapProvider);
			if (ConfigurationManager.AppSettings["IsStaffSite"] != null && ConfigurationManager.AppSettings["IsStaffSite"] == "true")
			{
				val2 = FindWebsite(app, app.Request, Website.StaticBusinessContainer, publishedOnly: false);
			}
			if (val2 != null && flag && (int)((AtomBaseSerializationNeutral)val2).DocumentStatusCode != 40)
			{
				val2 = FindWebsite(app, app.Request, Website.StaticBusinessContainer, publishedOnly: true);
			}
			text2 = ((val2 == null) ? string.Empty : ("&WebsiteKey=" + val2.WebsiteKey.ToString()));
			if (val2 != null)
			{
				if (!val2.IsActive)
				{
					app.Response.Clear();
					app.Response.ClearHeaders();
					app.Response.StatusCode = 503;
					app.Response.End();
					return;
				}
				if (val3 != null)
				{
					ImpersonationInformation val4 = SecurityContext.Impersonate(val3.UserId);
					try
					{
						if (!((SecureItem)((AtomBaseSerializationNeutral)val2).Document).AccessSet.SoftQuery((AclPermissionType)2))
						{
							BaseUrlRewriter.RewriteUrl(app.Context, "~/Error.aspx?iErrorType=Asi.Security.AccessDenied" + text2);
							return;
						}
					}
					finally
					{
						((IDisposable)val4)?.Dispose();
					}
				}
				else if (app.Request.QueryString["LoginRedirect"] == null || !app.Request.QueryString["LoginRedirect"].Equals("true", StringComparison.OrdinalIgnoreCase))
				{
					ImpersonationInformation val5 = SecurityContext.Impersonate(SecurityContext.AnonymousUserId);
					try
					{
						if (!((SecureItem)((AtomBaseSerializationNeutral)val2).Document).AccessSet.SoftQuery((AclPermissionType)2))
						{
							string s = string.Format(CultureInfo.InvariantCulture, "{0}{1}{2}", requestedPath, (BaseUrlRewriter.OriginalQueryString.Count > 0) ? "?" : string.Empty, BaseUrlRewriter.OriginalQueryString);
							BaseUrlRewriter.RewriteUrl(app.Context, FormsAuthentication.LoginUrl + "?ReturnUrl=" + app.Server.UrlEncode(s) + text2 + string.Format(CultureInfo.CurrentCulture, "&LoginMessage={0}", app.Server.UrlEncode(ResourceManager.GetPhrase("WebsiteAuthenticationRequired", "You must log in to access this website."))));
							return;
						}
					}
					finally
					{
						((IDisposable)val5)?.Dispose();
					}
				}
			}
			Navigation navigation = null;
			if (requestedPath.Length <= 0)
			{
				return;
			}
			requestedPath = AddDefaultDocument(requestedPath);
			string text3 = requestedPath;
			if (app.Request.QueryString["hkey"] != null)
			{
				SiteMapNode siteMapNode = siteMapProviderBase.FindSiteMapNodeFromKey(app.Request.QueryString["hkey"]);
				if (siteMapNode != null)
				{
					text3 = siteMapNode.Url;
				}
			}
			else if (app.Request.QueryString["HierarchyCode"] != null)
			{
				string value = app.Request.QueryString["hkey"];
				if (!string.IsNullOrEmpty(value))
				{
					SiteMapNode siteMapNode2 = siteMapProviderBase.FindSiteMapNodeFromCode(val2.RootHierarchyKey, app.Request.QueryString["hkey"]);
					if (siteMapNode2 != null)
					{
						text3 = siteMapNode2.Url;
					}
				}
			}
			if (val2 != null && string.IsNullOrEmpty(text3))
			{
				text3 = $"~/{((AtomBaseSerializationNeutral)val2).Name}/Default.aspx";
			}
			text3 = InterpretPath(text3, app, val2, flag, ref navigation);
			text3 = AddDefaultDocument(text3);
			if (val2 != null && app.Request.QueryString["WebsiteKey"] == null)
			{
				text3 = AddQueryParam(app, text3, "WebsiteKey", val2.WebsiteKey.ToString());
			}
			if (navigation != null && app.Request.QueryString["hkey"] == null)
			{
				ImpersonationInformation val6 = SecurityContext.Impersonate("MANAGER");
				try
				{
					text3 = AddQueryParam(app, text3, "hkey", ((AtomBaseHierarchy)navigation).HierarchyKey.ToString());
				}
				finally
				{
					((IDisposable)val6)?.Dispose();
				}
			}
			if (navigation != null)
			{
				ImpersonationInformation val7 = ((val3 != null) ? SecurityContext.Impersonate(val3.UserId) : SecurityContext.Impersonate(SecurityContext.AnonymousUserId));
				ImpersonationInformation val8 = val7;
				try
				{
					bool flag2 = true;
					SiteMapNode siteMapNode3 = siteMapProviderBase.FindSiteMapNodeFromKey(((AtomBaseHierarchy)navigation).HierarchyKey.ToString(), checkAccessibility: false);
					if (siteMapNode3 != null)
					{
						if (!siteMapNode3.IsAccessibleToUser(app.Context))
						{
							flag2 = false;
						}
					}
					else if (!((SecureItem)((AtomBaseSerializationNeutral)navigation).Document).AccessSet.SoftQuery((AclPermissionType)2))
					{
						flag2 = false;
					}
					if (!flag2)
					{
						if (val.ActualPrincipal != null && val.ActualPrincipal.Identity != null && val.ActualPrincipal.Identity.IsAuthenticated)
						{
							BaseUrlRewriter.RewriteUrl(app.Context, "~/Error.aspx?iErrorType=Asi.Security.AccessDenied" + text2);
							return;
						}
						BaseUrlRewriter.RewriteUrl(app.Context, FormsAuthentication.LoginUrl + "?ReturnUrl=" + app.Server.UrlEncode(app.Request.RawUrl) + text2 + string.Format(CultureInfo.CurrentCulture, "&LoginMessage={0}", app.Server.UrlEncode(ResourceManager.GetPhrase("WebsiteAuthenticationRequired", "You must log in to access this content."))));
						return;
					}
				}
				finally
				{
					((IDisposable)val8)?.Dispose();
				}
			}
			if (text3.IndexOf("://", StringComparison.Ordinal) > 0)
			{
				Uri uri = new Uri(text3);
				text3 = "~" + uri.PathAndQuery;
			}
			if (app.Request.QueryString["hkey"] != null)
			{
				text3 = Utilities.RemoveFromQueryString(text3, "hkey");
			}
			string path = (text3.Contains("?") ? text3.Substring(0, text3.IndexOf("?", StringComparison.Ordinal)) : text3);
			if (!File.Exists(app.Server.MapPath(path)))
			{
				text3 = text;
				text3 = AddQueryParam(app, text3, "WebsiteKey", val2.WebsiteKey.ToString());
			}
			BaseUrlRewriter.RewriteUrl(app.Context, text3);
		}
		finally
		{
			((IDisposable)val)?.Dispose();
		}
	}

	private static string AddDefaultDocument(string requestedPath)
	{
		string text = StripQueryString(ref requestedPath, null);
		if (requestedPath.Substring(requestedPath.Length - 1) == "/")
		{
			requestedPath += "Default.aspx";
		}
		else if (requestedPath.LastIndexOf("/", StringComparison.Ordinal) >= 0 && requestedPath.Substring(requestedPath.LastIndexOf("/", StringComparison.Ordinal)).IndexOf(".", StringComparison.Ordinal) < 0)
		{
			requestedPath += "/Default.aspx";
		}
		if (!string.IsNullOrEmpty(text))
		{
			requestedPath = requestedPath + "?" + text;
		}
		return requestedPath;
	}

	private string InterpretPath(string requestedPath, HttpApplication app, Website website, bool publishedOnly, ref Navigation navigation)
	{
		string url = requestedPath;
		string text = StripQueryString(ref url, null);
		if (url.StartsWith("/", StringComparison.Ordinal))
		{
			url = "~" + url;
		}
		url = ReplaceVirtualDirectory(url);
		if (website != null && (url.Equals("~/", StringComparison.OrdinalIgnoreCase) || url.Equals("~/Default.aspx", StringComparison.OrdinalIgnoreCase) || url.Equals("~/" + ((AtomBaseSerializationNeutral)website).Name + "/", StringComparison.OrdinalIgnoreCase) || url.Equals("~/" + ((AtomBaseSerializationNeutral)website).Name + "/Default.aspx", StringComparison.OrdinalIgnoreCase)))
		{
			url = website.WebsiteLink;
			text = StripQueryString(ref url, text);
			if (url.EndsWith("/", StringComparison.Ordinal))
			{
				url += "Default.aspx";
			}
			else if (url.Substring(url.LastIndexOf("/", StringComparison.Ordinal)).IndexOf(".", StringComparison.Ordinal) < 0)
			{
				url += "/Default.aspx";
			}
		}
		if (url.IndexOf("://", StringComparison.Ordinal) > 0)
		{
			Uri uri = new Uri(url);
			url = uri.AbsolutePath;
		}
		if (website != null)
		{
			if (!url.Equals("~/Default.aspx", StringComparison.OrdinalIgnoreCase) && !File.Exists(app.Server.MapPath(url)))
			{
				url = ReplaceWebsiteName(website, url);
			}
			if (!url.Equals("~/Default.aspx", StringComparison.OrdinalIgnoreCase) && !File.Exists(app.Server.MapPath(url)) && (VirtualPathUtility.GetExtension(url) == string.Empty || VirtualPathUtility.GetFileName(url).Equals("default.aspx", StringComparison.OrdinalIgnoreCase)))
			{
				url = ReplaceURLMapping(app, url, website);
				text = StripQueryString(ref url, text);
			}
			if (!url.Equals("~/Default.aspx", StringComparison.OrdinalIgnoreCase) && !File.Exists(app.Server.MapPath(url)) && (string.IsNullOrEmpty(VirtualPathUtility.GetExtension(url)) || VirtualPathUtility.GetFileName(url).Equals("default.aspx", StringComparison.OrdinalIgnoreCase)))
			{
				url = ReplaceURLMapping(app, url, null);
				text = StripQueryString(ref url, text);
			}
			if (!url.Equals("~/Default.aspx", StringComparison.OrdinalIgnoreCase) && !File.Exists(app.Server.MapPath(url)))
			{
				url = ReplaceNavigationPath(website, url, publishedOnly, ref navigation);
			}
			if (!url.Equals("~/Default.aspx", StringComparison.OrdinalIgnoreCase) && !File.Exists(app.Server.MapPath(url)))
			{
				url = ReplaceNavigationCode(website, url, publishedOnly, ref navigation);
			}
		}
		else if (!url.Equals("~/Default.aspx", StringComparison.OrdinalIgnoreCase) && !File.Exists(app.Server.MapPath(url)) && (string.IsNullOrEmpty(VirtualPathUtility.GetExtension(url)) || VirtualPathUtility.GetFileName(url).Equals("default.aspx", StringComparison.OrdinalIgnoreCase)))
		{
			url = ReplaceURLMapping(app, url, null);
			text = StripQueryString(ref url, text);
		}
		if (!string.IsNullOrEmpty(text))
		{
			url = url + "?" + text;
		}
		return url;
	}

	private static string StripQueryString(ref string url, string queryString)
	{
		string text = null;
		if (url.Contains("?"))
		{
			text = url.Substring(url.IndexOf('?') + 1);
			url = url.Remove(url.IndexOf("?", StringComparison.Ordinal));
		}
		if (string.IsNullOrEmpty(text))
		{
			text = queryString;
		}
		else if (!string.IsNullOrEmpty(queryString))
		{
			text = text + "&" + queryString;
		}
		return text;
	}

	private string AddQueryParam(HttpApplication app, string original, string paramName, string paramValue)
	{
		if (original.Contains("?" + paramName + "=") || original.Contains("&" + paramName + "=") || !string.IsNullOrEmpty(app.Request.QueryString[paramName]))
		{
			return original;
		}
		original = ((original.IndexOf("?", StringComparison.Ordinal) < 0) ? (original + "?") : (original + "&"));
		original = original + app.Server.UrlEncode(paramName) + "=" + app.Server.UrlEncode(paramValue);
		return original;
	}

	private string ReplaceVirtualDirectory(string requestPath)
	{
		string result = requestPath;
		string text = HttpRuntime.AppDomainAppVirtualPath.TrimEnd('/');
		if (!string.IsNullOrEmpty(text))
		{
			Match match = Regex.Match(requestPath, string.Format("{0}[/?]|{0}$", text), RegexOptions.IgnoreCase);
			if (match.Success)
			{
				result = ((match.Index + text.Length >= requestPath.Length) ? "~" : ("~" + requestPath.Substring(match.Index + text.Length)));
			}
		}
		return result;
	}

	private string ReplaceWebsiteName(Website website, string url)
	{
		string result = url;
		string name = ((AtomBaseSerializationNeutral)website).Name;
		int num = ((!HttpRuntime.AppDomainAppVirtualPath.TrimStart('/').Equals(name) || url.StartsWith("~", StringComparison.Ordinal)) ? url.IndexOf(name, StringComparison.OrdinalIgnoreCase) : (url.Substring(HttpRuntime.AppDomainAppVirtualPath.Length).IndexOf(name, StringComparison.OrdinalIgnoreCase) + HttpRuntime.AppDomainAppVirtualPath.Length));
		if (num >= 0)
		{
			string text = ((num == 0 || url.Substring(num - 1, 1).Equals("/", StringComparison.InvariantCulture)) ? url.Substring(num + name.Length) : url);
			if (string.IsNullOrEmpty(text) || text.StartsWith("/", StringComparison.InvariantCulture))
			{
				result = "~" + text;
			}
		}
		return result;
	}

	private string ReplaceNavigationCode(Website website, string url, bool publishedOnly, ref Navigation navigation)
	{
		string[] array = url.Split('/');
		if (array.Length >= 2)
		{
			string text = array[1];
			ImpersonationInformation val = SecurityContext.Impersonate("MANAGER");
			try
			{
				navigation = Navigation.GetFromNavigationCode(website.WebsiteKey, text, publishedOnly);
				if (navigation != null)
				{
					SiteMapNode siteMapNode = (publishedOnly ? SiteMap.Provider.FindSiteMapNodeFromKey(((AtomBaseHierarchy)navigation).HierarchyKey.ToString()) : SiteMap.Providers["AsiPreviewSiteMapProvider"].FindSiteMapNodeFromKey(((AtomBaseHierarchy)navigation).HierarchyKey.ToString()));
					if (siteMapNode != null)
					{
						return ReplaceNavigationPath(website, ReplaceWebsiteName(website, siteMapNode.Url), publishedOnly, ref navigation);
					}
				}
				return url;
			}
			finally
			{
				((IDisposable)val)?.Dispose();
			}
		}
		return url;
	}

	private string ReplaceNavigationPath(Website website, string url, bool publishedOnly, ref Navigation navigation)
	{
		string result = url;
		string[] array = url.Split('/');
		if (array.Length >= 2)
		{
			string text = url.Substring(0, url.LastIndexOf('/'));
			if (text.Length > 2 && text.Substring(0, 2) == "~/")
			{
				text = text.Substring(1);
			}
			ImpersonationInformation val = SecurityContext.Impersonate("MANAGER");
			try
			{
				string text2 = HttpUtility.UrlDecode(text);
				string text3 = text;
				NavigationHierarchy val2 = null;
				while (val2 == null)
				{
					val2 = NavigationHierarchy.FindByNavigationPath(website, text2, publishedOnly);
					if (val2 == null)
					{
						if (text2.LastIndexOf('/') >= 0)
						{
							text2 = text2.Substring(0, text2.LastIndexOf('/'));
							text3 = text3.Substring(0, text3.LastIndexOf('/'));
							continue;
						}
						break;
					}
					navigation = val2.Navigation;
					result = "~/" + url.Substring(text3.Length + 1).TrimEnd('/').TrimStart('/');
					break;
				}
			}
			finally
			{
				((IDisposable)val)?.Dispose();
			}
		}
		return result;
	}

	private string ReplaceURLMapping(HttpApplication app, string url, Website website)
	{
		if (url.Length > 2)
		{
			string text = VirtualPathUtility.GetDirectory(url).TrimStart('~').TrimEnd('/');
			ImpersonationInformation val = SecurityContext.Impersonate("MANAGER");
			try
			{
				string text2 = string.Empty;
				UrlInfo val2 = ((website != null) ? URLMapping.FindURLByDirectoryName(text, website.WebsiteKey) : URLMapping.FindURLByDirectoryName(text));
				if (val2 != null && !string.IsNullOrEmpty(val2.Url))
				{
					if (val2.IsSecure)
					{
						if (website == null)
						{
							website = FindWebsite(app, app.Request, AppContext.CurrentContext.StatefulBusinessContainer, publishedOnly: false);
						}
						if (website != null && !new Uri(website.WebsiteRootURL, UriKind.RelativeOrAbsolute).IsLoopback)
						{
							val2.Url = val2.Url.Replace("~", website.WebsiteSecureBaseUrl);
						}
						string url2 = app.Request.RawUrl;
						text2 = val2.Url;
						string text3 = StripQueryString(ref url2, null);
						if (!string.IsNullOrEmpty(text3))
						{
							text2 += string.Format("{0}{1}", val2.Url.Contains("?") ? "&" : "?", text3);
						}
					}
					if (val2.Url.Substring(0, 1) != "~")
					{
						app.Response.Redirect((!string.IsNullOrEmpty(text2)) ? text2 : val2.Url, endResponse: true);
					}
					return val2.Url;
				}
				return url;
			}
			finally
			{
				((IDisposable)val)?.Dispose();
			}
		}
		return url;
	}

	private Website FindWebsite(HttpApplication app, HttpRequest request, BusinessContainer container, bool publishedOnly)
	{
		if (request.QueryString["WebsiteKey"] != null && Utilities.IsGuid(request.QueryString["WebsiteKey"]))
		{
			return FindWebsiteByWebsiteKey(new Guid(request.QueryString["WebsiteKey"]), container, publishedOnly);
		}
		return FindWebsiteByPath(app, request, publishedOnly);
	}

	private Website FindWebsiteByWebsiteKey(Guid websiteKey, BusinessContainer container, bool publishedOnly)
	{
		Website val = null;
		ImpersonationInformation val2 = SecurityContext.Impersonate("MANAGER");
		try
		{
			val = Website.GetFromWebsiteKey(websiteKey, container, publishedOnly);
		}
		finally
		{
			((IDisposable)val2)?.Dispose();
		}
		if (val == null)
		{
			throw new WebsiteKeyNotFoundException(websiteKey);
		}
		return val;
	}

	private Website FindWebsiteByPath(HttpApplication app, HttpRequest request, bool publishedOnly)
	{
		ImpersonationInformation val = SecurityContext.Impersonate("MANAGER");
		try
		{
			string text;
			if (request.AppRelativeCurrentExecutionFilePath.Equals("~/404.aspx"))
			{
				text = new Uri(Get404RequestedPage(app.Request)).AbsolutePath;
				if (text.StartsWith(HttpRuntime.AppDomainAppVirtualPath, StringComparison.OrdinalIgnoreCase))
				{
					text = text.Substring(HttpRuntime.AppDomainAppVirtualPath.Length);
				}
				text = "~" + text;
			}
			else
			{
				text = request.AppRelativeCurrentExecutionFilePath;
			}
			Website val2 = null;
			if (text.LastIndexOf("/", StringComparison.Ordinal) >= 0 && text.Substring(text.LastIndexOf("/", StringComparison.Ordinal)).IndexOf(".", StringComparison.Ordinal) < 0)
			{
				text += "/";
			}
			if (text.IndexOf("/", 2, StringComparison.Ordinal) > 2)
			{
				string text2 = text.Substring(2, text.IndexOf("/", 2, StringComparison.InvariantCulture) - 2);
				val2 = Website.FindWebsiteByName(text2, publishedOnly);
			}
			if (val2 == null)
			{
				string text3 = request.Url.ToString();
				if (text3.LastIndexOf("/", StringComparison.Ordinal) >= 0 && text3.Substring(text3.LastIndexOf("/", StringComparison.Ordinal)).IndexOf(".", StringComparison.Ordinal) < 0)
				{
					text3 += "/";
				}
				Uri uri = new Uri(text3);
				bool flag = default(bool);
				val2 = Website.FindWebsiteByURL(uri, publishedOnly, ref flag);
			}
			return val2;
		}
		finally
		{
			((IDisposable)val)?.Dispose();
		}
	}
}
