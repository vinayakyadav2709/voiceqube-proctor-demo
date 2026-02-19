import { InterviewProctor } from "@timadey/proctor";

// Example: How to use InterviewProctor in your React app

const proctor = new InterviewProctor();

// 1. Setup event handler - Frontend developer can show prompts however they want
proctor.onEvent((event) => {
  // Event structure:
  // {
  //   type: "NO_FACE",
  //   severity: 8,
  //   timestamp: 1234567890,
  //   message: "No face detected",
  //   metadata: {...}
  // }
  
  // Show custom alert/prompt however you want:
  if (event.severity >= 8) {
    showCriticalAlert(event.message);
  } else if (event.severity >= 5) {
    showWarningToast(event.message);
  } else {
    console.log(event.message);
  }
});

// 2. Setup session end handler - Get complete JSON report
proctor.onSessionEnd((report) => {
  // Report structure:
  console.log("Session Report:", report);
  
  // Example report:
  // {
  //   sessionId: "session_1234567890_abc123",
  //   startTime: 1234567890000,
  //   endTime: 1234567950000,
  //   duration: 60000,
  //   summary: {
  //     totalEvents: 45,
  //     criticalEvents: 2,
  //     highEvents: 5,
  //     mediumEvents: 12,
  //     lowEvents: 26,
  //     suspiciousScore: 35,
  //     riskLevel: "MEDIUM"
  //   },
  //   violations: [
  //     { type: "TAB_SWITCHED", severity: 8, count: 3, description: "..." },
  //     { type: "MULTIPLE_FACES", severity: 10, count: 1, description: "..." }
  //   ],
  //   patterns: [
  //     { name: "lookingAwayAndTalking", severity: 8, occurrences: 2 }
  //   ],
  //   statistics: {
  //     faceDetection: { noFaceFrames: 5, multipleFaceFrames: 1, ... },
  //     audioDetection: { totalTalkingDuration: 15000, ... },
  //     browserTelemetry: { tabSwitches: 3, clipboardAttempts: 0, ... }
  //   }
  // }
  
  // Send to your backend:
  sendToBackend(report);
});

// 3. Initialize and start
async function startInterview() {
  await proctor.initialize({
    enableVisual: true,
    enableAudio: true,
    enablePattern: true,
    enableTelemetry: true
  });
  
  const videoElement = document.getElementById("webcam");
  await proctor.start(videoElement);
}

// 4. End session and get report
function endInterview() {
  const report = proctor.stop();
  // Report is also sent to onSessionEnd callback
  console.log("Interview ended. Suspicious score:", report.summary.suspiciousScore);
}

// Helper functions (implement however you want)
function showCriticalAlert(message) {
  // Your custom UI
  alert(`🚨 CRITICAL: ${message}`);
}

function showWarningToast(message) {
  // Your custom UI
  console.warn(`⚠️ WARNING: ${message}`);
}

function sendToBackend(report) {
  fetch("/api/interview-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report)
  });
}
