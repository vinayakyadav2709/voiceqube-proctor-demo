import { ProctoringEngine } from "./ProctoringEngine.js";

const EVENT_TYPES = {
  GAZE_AWAY: 'GAZE_AWAY',
  EYES_OFF_SCREEN: 'EYES_OFF_SCREEN',
  NO_FACE: 'NO_FACE',
  MULTIPLE_FACES: 'MULTIPLE_FACES',
  MOUTH_MOVING: 'MOUTH_MOVING',
  SUSPICIOUS_OBJECT: 'SUSPICIOUS_OBJECT',
  TAB_SWITCHED: 'TAB_SWITCHED',
  WINDOW_FOCUS_LOST: 'WINDOW_FOCUS_LOST',
  WINDOW_FOCUS_RESTORED: 'WINDOW_FOCUS_RESTORED',
};

const SEVERITY_LEVELS = {
  LOW: 1,
  MEDIUM: 5,
  HIGH: 8,
  CRITICAL: 10,
};

/**
 * @typedef {Object} ProctorEvent
 * @property {string} type
 * @property {number} severity
 * @property {number} timestamp
 * @property {string} message
 * @property {Object} [metadata]
 */

/**
 * @typedef {Object} SessionReport
 * @property {string} sessionId
 * @property {number} startTime
 * @property {number} endTime
 * @property {number} duration
 * @property {Object} summary
 * @property {number} summary.totalEvents
 * @property {number} summary.criticalEvents
 * @property {number} summary.highEvents
 * @property {number} summary.mediumEvents
 * @property {number} summary.lowEvents
 * @property {number} summary.suspiciousScore
 * @property {string} summary.riskLevel
 * @property {Array} violations
 * @property {Array} patterns
 * @property {Object} statistics
 */

/**
 * @callback EventCallback
 * @param {ProctorEvent} event
 */

/**
 * @callback ReportCallback
 * @param {SessionReport} report
 */

export class InterviewProctor {
  /**
   * @param {string} [sessionId]
   */
  constructor(sessionId) {
    this.sessionId = sessionId || this.generateSessionId();
    this.events = [];
    this.patterns = [];
    this.isRunning = false;
    this.startTime = 0;
    this.engine = null;
    this.eventCallback = null;
    this.reportCallback = null;
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * @param {Object} [config]
   * @param {boolean} [config.enableVisual]
   * @param {boolean} [config.enableAudio]
   * @param {boolean} [config.enablePattern]
   * @param {boolean} [config.enableTelemetry]
   */
  async initialize(config = {}) {
    const {
      enableVisual = true,
      enableAudio = true,
      enablePattern = true,
      enableTelemetry = true,
    } = config;

    this.engine = ProctoringEngine.getInstance({
      enableVisualDetection: enableVisual,
      enableAudioMonitoring: enableAudio,
      enablePatternDetection: enablePattern,
      enableBrowserTelemetry: enableTelemetry,

      onEvent: (rawEvent) => {
        const event = this.transformEvent(rawEvent);
        this.events.push(event);
        
        if (this.eventCallback) {
          this.eventCallback(event);
        }
      },

      onBehavioralPattern: (rawPattern) => {
        const pattern = this.transformPattern(rawPattern);
        this.updatePattern(pattern);
        
        const event = {
          type: `PATTERN_${rawPattern.pattern.toUpperCase()}`,
          severity: rawPattern.severity,
          timestamp: Date.now(),
          message: `Suspicious pattern detected: ${rawPattern.pattern}`,
          metadata: rawPattern,
        };
        
        this.events.push(event);
        if (this.eventCallback) {
          this.eventCallback(event);
        }
      },
    });

    await this.engine.initialize();
  }

  /**
   * @param {EventCallback} callback
   */
  onEvent(callback) {
    this.eventCallback = callback;
  }

  /**
   * @param {ReportCallback} callback
   */
  onSessionEnd(callback) {
    this.reportCallback = callback;
  }

  /**
   * @param {HTMLVideoElement} [videoElement]
   */
  async start(videoElement) {
    if (!this.engine) {
      throw new Error("Proctor not initialized. Call initialize() first.");
    }

    this.startTime = Date.now();
    this.isRunning = true;

    if (videoElement) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      videoElement.srcObject = stream;
      
      await new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play();
          this.engine.start(videoElement);
          resolve();
        };
      });
    } else {
      this.engine.start();
    }

    this.emitSystemEvent("SESSION_STARTED", "Interview session started");
  }

  stop() {
    if (!this.isRunning) {
      throw new Error("Session not running");
    }

    this.isRunning = false;
    const endTime = Date.now();
    
    this.engine.stop();
    
    const videoElements = document.querySelectorAll("video");
    videoElements.forEach((video) => {
      if (video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    });

    const report = this.generateReport(endTime);
    
    this.emitSystemEvent("SESSION_ENDED", "Interview session ended");
    
    if (this.reportCallback) {
      this.reportCallback(report);
    }

    return report;
  }

  emitSystemEvent(type, message) {
    const event = {
      type,
      severity: 1,
      timestamp: Date.now(),
      message,
    };
    this.events.push(event);
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }

  transformEvent(rawEvent) {
    const eventMap = {
      [EVENT_TYPES.NO_FACE]: { message: "No face detected", severity: SEVERITY_LEVELS.HIGH },
      [EVENT_TYPES.MULTIPLE_FACES]: { message: "Multiple faces detected", severity: SEVERITY_LEVELS.CRITICAL },
      [EVENT_TYPES.GAZE_AWAY]: { message: "Candidate looking away from screen", severity: SEVERITY_LEVELS.MEDIUM },
      [EVENT_TYPES.EYES_OFF_SCREEN]: { message: "Eyes not focused on screen", severity: SEVERITY_LEVELS.HIGH },
      [EVENT_TYPES.MOUTH_MOVING]: { message: "Mouth movement detected", severity: SEVERITY_LEVELS.MEDIUM },
      [EVENT_TYPES.SUSPICIOUS_OBJECT]: { message: "Suspicious object detected", severity: SEVERITY_LEVELS.HIGH },
      [EVENT_TYPES.TAB_SWITCHED]: { message: "Switched to different tab/window", severity: SEVERITY_LEVELS.HIGH },
      [EVENT_TYPES.WINDOW_FOCUS_LOST]: { message: "Window lost focus", severity: SEVERITY_LEVELS.MEDIUM },
      [EVENT_TYPES.WINDOW_FOCUS_RESTORED]: { message: "Window focus restored", severity: SEVERITY_LEVELS.LOW },
    };

    const mapped = eventMap[rawEvent.event] || {
      message: rawEvent.event,
      severity: rawEvent.lv || SEVERITY_LEVELS.LOW,
    };

    return {
      type: rawEvent.event,
      severity: rawEvent.lv || mapped.severity,
      timestamp: rawEvent.ts || Date.now(),
      message: mapped.message,
      metadata: rawEvent,
    };
  }

  transformPattern(rawPattern) {
    return {
      name: rawPattern.pattern,
      severity: rawPattern.severity,
      occurrences: rawPattern.count || 1,
      firstSeen: rawPattern.timestamp,
      lastSeen: rawPattern.timestamp,
    };
  }

  updatePattern(newPattern) {
    const existing = this.patterns.find((p) => p.name === newPattern.name);
    if (existing) {
      existing.occurrences += 1;
      existing.lastSeen = newPattern.lastSeen;
    } else {
      this.patterns.push(newPattern);
    }
  }

  generateReport(endTime) {
    const duration = endTime - this.startTime;
    
    const criticalEvents = this.events.filter((e) => e.severity >= SEVERITY_LEVELS.CRITICAL);
    const highEvents = this.events.filter((e) => e.severity >= SEVERITY_LEVELS.HIGH && e.severity < SEVERITY_LEVELS.CRITICAL);
    const mediumEvents = this.events.filter((e) => e.severity >= SEVERITY_LEVELS.MEDIUM && e.severity < SEVERITY_LEVELS.HIGH);
    const lowEvents = this.events.filter((e) => e.severity < SEVERITY_LEVELS.MEDIUM);

    const suspiciousScore = this.calculateSuspiciousScore();
    
    let riskLevel = "LOW";
    if (suspiciousScore >= 80) riskLevel = "CRITICAL";
    else if (suspiciousScore >= 50) riskLevel = "HIGH";
    else if (suspiciousScore >= 20) riskLevel = "MEDIUM";

    const violations = this.groupViolations();

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      duration,
      summary: {
        totalEvents: this.events.length,
        criticalEvents: criticalEvents.length,
        highEvents: highEvents.length,
        mediumEvents: mediumEvents.length,
        lowEvents: lowEvents.length,
        suspiciousScore,
        riskLevel,
      },
      violations,
      patterns: this.patterns,
      statistics: {
        faceDetection: this.calculateFaceStats(),
        audioDetection: this.calculateAudioStats(),
        browserTelemetry: this.calculateTelemetryStats(),
      },
    };
  }

  calculateSuspiciousScore() {
    let score = 0;
    
    this.events.forEach((event) => {
      score += event.severity;
    });

    this.patterns.forEach((pattern) => {
      score += pattern.severity * pattern.occurrences;
    });

    return Math.min(100, Math.round(score / 10));
  }

  groupViolations() {
    const grouped = new Map();

    this.events.forEach((event) => {
      if (event.severity >= SEVERITY_LEVELS.MEDIUM) {
        const existing = grouped.get(event.type);
        if (existing) {
          existing.count += 1;
        } else {
          grouped.set(event.type, {
            type: event.type,
            severity: event.severity,
            timestamp: event.timestamp,
            description: event.message,
            count: 1,
          });
        }
      }
    });

    return Array.from(grouped.values()).sort((a, b) => b.severity - a.severity);
  }

  calculateFaceStats() {
    const faceEvents = this.events.filter((e) => 
      e.type.includes("FACE") || e.type.includes("GAZE")
    );

    return {
      totalFrames: faceEvents.length,
      noFaceFrames: this.events.filter((e) => e.type === EVENT_TYPES.NO_FACE).length,
      multipleFaceFrames: this.events.filter((e) => e.type === EVENT_TYPES.MULTIPLE_FACES).length,
      lookingAwayDuration: this.events
        .filter((e) => e.type === EVENT_TYPES.GAZE_AWAY)
        .reduce((sum, e) => sum + (e.metadata?.duration || 0), 0),
      gazeDirectionChanges: this.events.filter((e) => e.type === EVENT_TYPES.GAZE_AWAY).length,
    };
  }

  calculateAudioStats() {
    const audioEvents = this.events.filter((e) => 
      e.type.includes("TALK") || e.type.includes("WHISPER")
    );

    return {
      totalTalkingDuration: audioEvents
        .filter((e) => e.type === "TALKING_DETECTED")
        .reduce((sum, e) => sum + (e.metadata?.duration || 0), 0),
      totalWhisperingDuration: audioEvents
        .filter((e) => e.type === "WHISPERING_DETECTED")
        .reduce((sum, e) => sum + (e.metadata?.duration || 0), 0),
      talkingEpisodes: audioEvents.filter((e) => e.type === "TALKING_EPISODE").length,
      whisperingEpisodes: audioEvents.filter((e) => e.type === "WHISPERING_DETECTED").length,
      maxAudioLevel: Math.max(...audioEvents.map((e) => e.metadata?.decibels || -100), -100),
    };
  }

  calculateTelemetryStats() {
    return {
      tabSwitches: this.events.filter((e) => e.type === EVENT_TYPES.TAB_SWITCHED).length,
      focusLosses: this.events.filter((e) => e.type === EVENT_TYPES.WINDOW_FOCUS_LOST).length,
      clipboardAttempts: this.events.filter((e) => 
        e.type.includes("COPY") || e.type.includes("PASTE") || e.type.includes("CUT")
      ).length,
      keyboardShortcuts: this.events.filter((e) => e.type.includes("KEY")).length,
      fullscreenExits: this.events.filter((e) => e.type.includes("FULLSCREEN")).length,
    };
  }

  getSessionId() {
    return this.sessionId;
  }

  isSessionRunning() {
    return this.isRunning;
  }

  getCurrentEvents() {
    return [...this.events];
  }
}

export default InterviewProctor;
