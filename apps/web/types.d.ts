declare module '@timadey/proctor' {
  export interface ProctorEvent {
    type: string;
    severity: number;
    timestamp: number;
    message: string;
    metadata?: Record<string, any>;
  }

  export interface SessionReport {
    sessionId: string;
    startTime: number;
    endTime: number;
    duration: number;
    summary: {
      totalEvents: number;
      criticalEvents: number;
      highEvents: number;
      mediumEvents: number;
      lowEvents: number;
      suspiciousScore: number;
      riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    };
    violations: Array<{
      type: string;
      severity: number;
      timestamp: number;
      description: string;
      count: number;
    }>;
    patterns: Array<{
      name: string;
      severity: number;
      occurrences: number;
      firstSeen: number;
      lastSeen: number;
    }>;
    statistics: {
      faceDetection: {
        totalFrames: number;
        noFaceFrames: number;
        multipleFaceFrames: number;
        lookingAwayDuration: number;
        gazeDirectionChanges: number;
      };
      audioDetection: {
        totalTalkingDuration: number;
        totalWhisperingDuration: number;
        talkingEpisodes: number;
        whisperingEpisodes: number;
        maxAudioLevel: number;
      };
      browserTelemetry: {
        tabSwitches: number;
        focusLosses: number;
        clipboardAttempts: number;
        keyboardShortcuts: number;
        fullscreenExits: number;
      };
    };
  }

  export type EventCallback = (event: ProctorEvent) => void;
  export type ReportCallback = (report: SessionReport) => void;

  export class InterviewProctor {
    constructor(sessionId?: string);
    initialize(config?: {
      enableVisual?: boolean;
      enableAudio?: boolean;
      enablePattern?: boolean;
      enableTelemetry?: boolean;
    }): Promise<void>;
    onEvent(callback: EventCallback): void;
    onSessionEnd(callback: ReportCallback): void;
    start(videoElement?: HTMLVideoElement): Promise<void>;
    stop(): SessionReport;
    getSessionId(): string;
    isSessionRunning(): boolean;
    getCurrentEvents(): ProctorEvent[];
  }

  export const EVENT_TYPES: {
    GAZE_AWAY: string;
    EYES_OFF_SCREEN: string;
    NO_FACE: string;
    MULTIPLE_FACES: string;
    MOUTH_MOVING: string;
    SUSPICIOUS_OBJECT: string;
    TAB_SWITCHED: string;
    WINDOW_FOCUS_LOST: string;
    WINDOW_FOCUS_RESTORED: string;
  };

  export const SEVERITY_LEVELS: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    CRITICAL: number;
  };

  export class ProctoringEngine {
    static getInstance(options?: any): ProctoringEngine;
    initialize(): Promise<void>;
    start(videoElement?: HTMLVideoElement): void;
    stop(): void;
    getSessionSummary(): any;
  }
}
