import { useState, useEffect, useRef, useCallback } from "react";
import { InterviewProctor } from "@timadey/proctor";
import type { ProctorEvent, SessionReport } from "@timadey/proctor";
import "./App.css";

export default function App() {
  const [isInit, setIsInit] = useState(false);
  const [running, setRunning] = useState(false);
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [duration, setDuration] = useState(0);
  const [alert, setAlert] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const proctorRef = useRef<InterviewProctor | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleEvent = useCallback((event: ProctorEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 50));
    
    if (event.severity >= 8) {
      setAlert(`🚨 ${event.message}`);
      setTimeout(() => setAlert(null), 5000);
    } else if (event.severity >= 5) {
      setAlert(`⚠️ ${event.message}`);
      setTimeout(() => setAlert(null), 3000);
    }
  }, []);

  const handleSessionEnd = useCallback((sessionReport: SessionReport) => {
    setReport(sessionReport);
    console.log("Session Report:", sessionReport);
  }, []);

  const init = async () => {
    proctorRef.current = new InterviewProctor();
    proctorRef.current.onEvent(handleEvent);
    proctorRef.current.onSessionEnd(handleSessionEnd);
    
    await proctorRef.current.initialize({
      enableVisual: true,
      enableAudio: true,
      enablePattern: true,
      enableTelemetry: true
    });
    
    setIsInit(true);
  };

  const start = async () => {
    if (!proctorRef.current) return;
    
    await proctorRef.current.start(videoRef.current || undefined);
    setRunning(true);
    setReport(null);
    
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);
  };

  const stop = () => {
    if (!proctorRef.current) return;
    
    proctorRef.current.stop();
    setRunning(false);
    setDuration(0);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 10) return "#ff4444";
    if (severity >= 8) return "#ff8800";
    if (severity >= 5) return "#ffcc00";
    return "#44ff44";
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL": return "#ff4444";
      case "HIGH": return "#ff8800";
      case "MEDIUM": return "#ffcc00";
      default: return "#44ff44";
    }
  };

  return (
    <div className="container">
      <h1>AI Interview Proctoring</h1>
      
      {alert && (
        <div className="alert-banner" style={{ 
          background: alert.includes("🚨") ? "#ff4444" : "#ff8800",
          padding: "12px",
          borderRadius: "8px",
          marginBottom: "20px",
          textAlign: "center"
        }}>
          {alert}
        </div>
      )}
      
      <div className="video-box">
        <video ref={videoRef} autoPlay playsInline muted />
        {!running && <div className="overlay">Camera Off</div>}
      </div>

      <div className="stats">
        <div>Status: <span className={running ? "green" : "red"}>{running ? "Running" : "Stopped"}</span></div>
        <div>Duration: {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}</div>
        <div>Events: {events.length}</div>
        {report && (
          <>
            <div>Score: <span style={{ color: getRiskColor(report.summary.riskLevel) }}>{report.summary.suspiciousScore}</span></div>
            <div>Risk: <span style={{ color: getRiskColor(report.summary.riskLevel) }}>{report.summary.riskLevel}</span></div>
          </>
        )}
      </div>

      <div className="buttons">
        {!isInit ? (
          <button onClick={init} className="btn primary">Initialize</button>
        ) : !running ? (
          <button onClick={start} className="btn primary">Start Interview</button>
        ) : (
          <button onClick={stop} className="btn danger">End Interview</button>
        )}
      </div>

      {running && events.length > 0 && (
        <div className="events">
          <h3>Recent Events ({events.length})</h3>
          {events.slice(0, 10).map((e, i) => (
            <div key={i} className="event" style={{ borderLeft: `4px solid ${getSeverityColor(e.severity)}` }}>
              <span>{e.message}</span>
              <span style={{ color: getSeverityColor(e.severity) }}>Lv.{e.severity}</span>
            </div>
          ))}
        </div>
      )}

      {report && (
        <div className="report">
          <h3>Session Report</h3>
          <div className="report-grid">
            <div className="report-section">
              <h4>Summary</h4>
              <p>Session ID: {report.sessionId}</p>
              <p>Duration: {Math.floor(report.duration / 1000)}s</p>
              <p>Total Events: {report.summary.totalEvents}</p>
              <p>Critical: {report.summary.criticalEvents}</p>
              <p>High: {report.summary.highEvents}</p>
              <p>Medium: {report.summary.mediumEvents}</p>
              <p>Low: {report.summary.lowEvents}</p>
              <p style={{ color: getRiskColor(report.summary.riskLevel) }}>
                Risk Level: {report.summary.riskLevel}
              </p>
              <p style={{ color: getRiskColor(report.summary.riskLevel) }}>
                Suspicious Score: {report.summary.suspiciousScore}/100
              </p>
            </div>
            
            {report.violations.length > 0 && (
              <div className="report-section">
                <h4>Violations ({report.violations.length})</h4>
                {report.violations.map((v, i) => (
                  <div key={i} className="violation" style={{ color: getSeverityColor(v.severity) }}>
                    {v.description} (x{v.count})
                  </div>
                ))}
              </div>
            )}
            
            {report.patterns.length > 0 && (
              <div className="report-section">
                <h4>Patterns Detected ({report.patterns.length})</h4>
                {report.patterns.map((p, i) => (
                  <div key={i} className="pattern" style={{ color: getSeverityColor(p.severity) }}>
                    {p.name} (x{p.occurrences})
                  </div>
                ))}
              </div>
            )}
            
            <div className="report-section">
              <h4>Statistics</h4>
              <p>Face Detection:</p>
              <ul>
                <li>No Face Frames: {report.statistics.faceDetection.noFaceFrames}</li>
                <li>Multiple Faces: {report.statistics.faceDetection.multipleFaceFrames}</li>
                <li>Looking Away: {Math.floor(report.statistics.faceDetection.lookingAwayDuration / 1000)}s</li>
              </ul>
              
              <p>Audio:</p>
              <ul>
                <li>Talking: {Math.floor(report.statistics.audioDetection.totalTalkingDuration / 1000)}s</li>
                <li>Whispering: {Math.floor(report.statistics.audioDetection.totalWhisperingDuration / 1000)}s</li>
                <li>Talking Episodes: {report.statistics.audioDetection.talkingEpisodes}</li>
              </ul>
              
              <p>Browser:</p>
              <ul>
                <li>Tab Switches: {report.statistics.browserTelemetry.tabSwitches}</li>
                <li>Focus Losses: {report.statistics.browserTelemetry.focusLosses}</li>
                <li>Clipboard Attempts: {report.statistics.browserTelemetry.clipboardAttempts}</li>
                <li>Keyboard Shortcuts: {report.statistics.browserTelemetry.keyboardShortcuts}</li>
              </ul>
            </div>
          </div>
          
          <div className="json-output">
            <h4>Full JSON Report (for backend)</h4>
            <pre>{JSON.stringify(report, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="features">
        <h3>Features Being Tested:</h3>
        <ul>
          <li>Face Detection (single/multiple/none)</li>
          <li>Gaze Tracking (left/right/down/center)</li>
          <li>Mouth Movement Detection</li>
          <li>Audio Detection (talking/whispering)</li>
          <li>Tab Switching Detection</li>
          <li>Clipboard Monitoring</li>
          <li>Keyboard Shortcuts Detection</li>
          <li>Pattern Detection</li>
        </ul>
      </div>
    </div>
  );
}
