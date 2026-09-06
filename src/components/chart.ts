import { State } from "../state/appState";

// --- Charts ---
export function updateCharts() {
  const isDark = State.theme === "dark";
  const textColor = isDark ? "#cccccc" : "#333333";
  const gridColor = isDark ? "#333333" : "#cccccc";

  // =========================================================
  // Timeline
  // =========================================================

  const dateCounts = new Map<string, number>();

  State.filteredLogs.forEach((log) => {
    const date = log.timestamp.split("T")[0];

    dateCounts.set(
      date,
      (dateCounts.get(date) || 0) + 1
    );
  });

  const sortedDates = Array.from(dateCounts.keys()).sort();

  const timelineData = sortedDates.map(
    (date) => dateCounts.get(date) || 0
  );

  if (State.charts.timeline) {
    State.charts.timeline.destroy();
  }

  const timelineCanvas = document.getElementById(
    "chart-timeline"
  ) as HTMLCanvasElement;

  const ctxTime = timelineCanvas.getContext("2d")!;

  State.charts.timeline = new (window as any).Chart(ctxTime, {
    type: "line",

    data: {
      labels: sortedDates,

      datasets: [
        {
          label: "Occurrences",
          data: timelineData,
          borderColor: "#007acc",
          tension: 0.1,
          pointRadius: 4,
          pointHoverRadius: 7,
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      plugins: {
        legend: {
          display: false,
        },

        title: {
          display: true,
          text: "Errors Over Time",
          color: textColor,
        },

        // IMPORTANT:
        // tooltip belongs INSIDE plugins
        tooltip: {
          enabled: true,

          callbacks: {
            title: (items: any[]) => {
              if (!items.length) {
                return "";
              }

              const date = new Date(
                `${items[0].label}T00:00:00`
              );

              return date.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
            },

            label: (context: any) => {
              return `Occurrences: ${context.parsed.y}`;
            },
          },
        },
      },

      scales: {
        x: {
          ticks: {
            color: textColor,
          },

          grid: {
            color: gridColor,
          },
        },

        y: {
          beginAtZero: true,

          ticks: {
            color: textColor,
            precision: 0,
          },

          grid: {
            color: gridColor,
          },
        },
      },
    },
  });

  // =========================================================
  // Version Chart
  // =========================================================

  const verCounts = new Map<string, number>();

  State.filteredLogs.forEach((log) => {
    const version = log.app_version || "Unknown";

    verCounts.set(
      version,
      (verCounts.get(version) || 0) + 1
    );
  });

  const sortedVers = Array.from(verCounts.keys()).sort(
    (a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true,
      })
  );

  const verData = sortedVers.map(
    (version) => verCounts.get(version) || 0
  );

  if (State.charts.versions) {
    State.charts.versions.destroy();
  }

  const versionCanvas = document.getElementById(
    "chart-versions"
  ) as HTMLCanvasElement;

  const ctxVer = versionCanvas.getContext("2d")!;

  State.charts.versions = new (window as any).Chart(ctxVer, {
    type: "bar",

    data: {
      labels: sortedVers,

      datasets: [
        {
          label: "Errors",
          data: verData,
          backgroundColor: "#f14c4c",
        },
      ],
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false,
      },

      plugins: {
        legend: {
          display: false,
        },

        title: {
          display: true,
          text: "Errors by Version",
          color: textColor,
        },

        tooltip: {
          enabled: true,

          callbacks: {
            title: (items: any[]) => {
              if (!items.length) {
                return "";
              }

              return `Version ${items[0].label}`;
            },

            label: (context: any) => {
              return `Errors: ${context.parsed.y}`;
            },
          },
        },
      },

      scales: {
        x: {
          ticks: {
            color: textColor,
          },

          grid: {
            display: false,
          },
        },

        y: {
          beginAtZero: true,

          ticks: {
            color: textColor,
            precision: 0,
          },

          grid: {
            color: gridColor,
          },
        },
      },
    },
  });
}