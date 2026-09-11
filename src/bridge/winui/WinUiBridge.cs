using Microsoft.UI.Xaml.Controls;
using Microsoft.Web.WebView2.Core;
using System.Text.Json;

public sealed class WinUiBridge
{
    private readonly WebView2 _webView;

    public WinUiBridge(WebView2 webView)
    {
        _webView = webView;

        _webView.CoreWebView2.WebMessageReceived
            += OnWebMessageReceived;
    }

    private async void OnWebMessageReceived(
        object? sender,
        CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var request =
                JsonSerializer.Deserialize<WinUiRequest>(
                    e.WebMessageAsJson);

            if (request == null)
                return;

            switch (request.Method)
            {
                case "getLogs":
                    await HandleGetLogs(request);
                    break;

                case "getApps":
                    await HandleGetApps(request);
                    break;

                case "refreshApps":
                    await HandleRefreshApps(request);
                    break;

                case "refreshLogs":
                    await HandleRefreshLogs(request);
                    break;

                default:
                    await SendError(
                        request.Id,
                        $"Unknown method: {request.Method}");
                    break;
            }
        }
        catch (Exception ex)
        {
            // If request ID can be recovered, return
            // the error to JavaScript.
        }
    }

    private async Task HandleGetLogs(
        WinUiRequest request)
    {
        var data =
            request.Data.Deserialize<GetLogsRequest>();

        if (data == null)
        {
            await SendError(
                request.Id,
                "Invalid getLogs request.");

            return;
        }

        var appNameLog =
            data.AppNameLog;

        // SAMPLE ONLY
        //
        // Later this will be:
        //
        // SQLiteRepository.GetLogsAsync(appNameLog)

        var logs =
            new List<object>
            {
                new
                {
                    app_name_log = appNameLog,
                    level = "error",
                    type = "NullReferenceException",
                    message = "Sample error from C#",
                    stack_trace =
                        "at ShepherdBible.ReaderViewModel.Insure()",
                    timestamp =
                        DateTime.UtcNow.ToString("O"),
                },
            };

        await SendSuccess(
            request.Id,
            logs);
    }

    private async Task HandleGetApps(
        WinUiRequest request)
    {
        var apps = new[]
        {
            "shepherd-bible-windows",
            "shepherd-bible-android",
        };

        await SendSuccess(
            request.Id,
            apps);
    }

    private async Task HandleRefreshApps(
        WinUiRequest request)
    {
        // Later:
        // Firebase → C# → SQLite

        var apps = new[]
        {
            "shepherd-bible-windows",
            "shepherd-bible-android",
        };

        await SendSuccess(
            request.Id,
            apps);
    }

    private async Task HandleRefreshLogs(
        WinUiRequest request)
    {
        var data =
            request.Data.Deserialize<
                RefreshLogsRequest>();

        if (data == null)
        {
            await SendError(
                request.Id,
                "Invalid refreshLogs request.");

            return;
        }

        // Later:
        //
        // 1. Read latest timestamp from SQLite.
        // 2. Query Firestore only for newer records.
        // 3. Insert them into SQLite.
        // 4. Return SQLite logs.

        await SendSuccess(
            request.Id,
            new
            {
                logs = Array.Empty<object>(),
                newCount = 0,
            });
    }

    private async Task SendSuccess(
        string id,
        object data)
    {
        var response = new
        {
            id,
            success = true,
            data,
        };

        var json =
            JsonSerializer.Serialize(response);

        _webView.CoreWebView2
            .PostWebMessageAsJson(json);

        await Task.CompletedTask;
    }

    private async Task SendError(
        string id,
        string error)
    {
        var response = new
        {
            id,
            success = false,
            error,
        };

        var json =
            JsonSerializer.Serialize(response);

        _webView.CoreWebView2
            .PostWebMessageAsJson(json);

        await Task.CompletedTask;
    }
}

public sealed class WinUiRequest
{
    public string Id { get; set; } = "";
    public string Method { get; set; } = "";
    public JsonElement Data { get; set; }
}

public sealed class GetLogsRequest
{
    public string AppNameLog { get; set; } = "";
    public bool ForceRefresh { get; set; }
}

public sealed class RefreshLogsRequest
{
    public string AppNameLog { get; set; } = "";
}