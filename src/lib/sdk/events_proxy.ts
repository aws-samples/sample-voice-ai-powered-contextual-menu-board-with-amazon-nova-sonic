import { NovaSonicBidirectionalStreamClient } from "./client";
import { toolDefinition } from "./types";
import { SettingsManager } from "../util/SettingsManager";

let sessionId: string;
let session: any; // Store session reference globally
let bedrockClient: NovaSonicBidirectionalStreamClient | null = null; // Lazy initialization

// Create Event Target
const target = new EventTarget();

// Get credentials from Cognito authentication
const getCredentials = () => {
  // Try to get credentials from Cognito authentication first
  const cognitoCredentials = SettingsManager.getCredentials();
  console.log("Cognito credentials:", cognitoCredentials);
  if (cognitoCredentials) {
    console.log("Using Cognito credentials for client initialization");
    return {
      accessKeyId: cognitoCredentials.accessKeyId,
      secretAccessKey: cognitoCredentials.secretAccessKey,
      sessionToken: cognitoCredentials.sessionToken,
    };
  }
  
  // Fallback for development: manually set credentials here
  // In production: this should be replaced with Cognito authentication
  console.log("No Cognito credentials found, using fallback credentials");
  return {
    accessKeyId: "", // Add your access key here for development
    secretAccessKey: "", // Add your secret key here for development
    sessionToken: "", // Add your session token here (if using temporary credentials)
  };
};

// Lazy client initialization - create client only when needed with fresh credentials
const getOrCreateClient = () => {
  const credentials = getCredentials();
  
  // Check if we have valid credentials
  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    throw new Error("No valid AWS credentials available. Please ensure you are authenticated.");
  }
  
  // Create new client with fresh credentials (always recreate to ensure fresh credentials)
  console.log("Creating new Bedrock client with fresh credentials");
  bedrockClient = new NovaSonicBidirectionalStreamClient({
    credentials,
    region: "us-east-1",
  });
  
  return bedrockClient;
};

// Periodically check for and close inactive sessions (every minute)
// Sessions with no activity for over 5 minutes will be force closed
// setInterval(() => {
//   console.log("Session cleanup check");
//   // Only run cleanup if client exists
//   if (!bedrockClient) {
//     return;
//   }
  
//   const now = Date.now();

//   // Check all active sessions
//   bedrockClient.getActiveSessions().forEach((sessionId) => {
//     const lastActivity = bedrockClient!.getLastActivityTime(sessionId);

//     // If no activity for 5 minutes, force close
//     if (now - lastActivity > 5 * 60 * 1000) {
//       console.log(
//         `Closing inactive session ${sessionId} after 5 minutes of inactivity`,
//       );
//       try {
//         bedrockClient!.forceCloseSession(sessionId);
//       } catch (error) {
//         console.error(
//           `Error force closing inactive session ${sessionId}:`,
//           error,
//         );
//       }
//     }
//   });
// }, 60000);

try {
  // Create the session when the UI request for it, not before
  target.addEventListener('createSession', () => {
    try {
      // Get or create client with fresh credentials
      const client = getOrCreateClient();
      
      // Create session with the new API
      session = client.createStreamSession();
      sessionId = session.getSessionId();

      target.dispatchEvent(new CustomEvent("sessionCreated", {detail: sessionId}));
    
    // Set up event handlers for session events
    session.onEvent("contentStart", (data: any) => {
      console.log("contentStart:", data);
      target.dispatchEvent(new CustomEvent("contentStart", { detail: data }));
    });

    session.onEvent("textOutput", (data: any) => {
      console.log("Text output:", data);
      target.dispatchEvent(new CustomEvent("textOutput", { detail: data }));
    });

    session.onEvent("audioOutput", (data: any) => {
      // console.log("Audio output received, sending to client");
      target.dispatchEvent(new CustomEvent("audioOutput", { detail: data }));
    });

    session.onEvent("error", (data: any) => {
      console.error("Error in session:", data);
      target.dispatchEvent(new CustomEvent("error", { detail: data }));
    });

    session.onEvent("toolUse", (data: any) => {
      console.log("Tool use detected:", data.toolName);
      target.dispatchEvent(new CustomEvent("toolUse", { detail: data }));
    });

    session.onEvent("toolResult", (data: any) => {
      console.log("Tool result received", data);
      target.dispatchEvent(new CustomEvent("toolResult", { detail: data }));
    });

    session.onEvent("contentEnd", (data: any) => {
      console.log("Content end received: ", data);
      target.dispatchEvent(new CustomEvent("contentEnd", { detail: data }));
    });

    session.onEvent("streamComplete", () => {
      console.log("Stream completed for client:", session.getSessionId());
      target.dispatchEvent(new Event("streamComplete"));
    });
    } catch (error) {
      console.error("Error creating session:", error);
      target.dispatchEvent(
        new CustomEvent("error", {
          detail: {
            message: "Error creating session",
            details: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  });
  
  target.addEventListener("initiateSession", async (e: Event) => {
    try{
      const customEvent = e as CustomEvent;
      const sessionId = customEvent.detail.sessionId;
      const tools = customEvent.detail.tools || []; // Get tools from the event detail
      console.log("events_proxy::Initiating session:", sessionId);
      console.log("events_proxy::Tools to register:", tools.length);
      
      // Get client (should already be created in createSession)
      if (!bedrockClient) {
        throw new Error("Bedrock client not initialized");
      }

      // TO DO: 6. Check if tools are present and if is an array to iterate on them and call bedrockClient.setTool() for each tool in the array before initiating the session - IMPLEMENTED ✅
      if (Array.isArray(tools) && tools.length > 0) {
        console.log(`🔧 Registering ${tools.length} tools with Bedrock client`);
        
        for (const tool of tools) {
          try {
            console.log(`🔧 Registering tool: ${tool.toolname}`);
            bedrockClient.setTool(tool.toolname, tool.definition, tool.action);
            console.log(`✅ Successfully registered tool: ${tool.toolname}`);
          } catch (error) {
            console.error(`❌ Failed to register tool ${tool.toolname}:`, error);
            // Continue with other tools even if one fails
          }
        }
        
        console.log(`🔧 Tool registration complete. Registered tools: ${bedrockClient.getRegisteredToolNames().join(', ')}`);
      } else {
        console.log("🔧 No tools to register");
      }
      
      bedrockClient.initiateSession(sessionId);
      target.dispatchEvent(new Event("sessionInitiated"));
    }catch(e){
      console.error("Error initiating session:", e);
      target.dispatchEvent(
        new CustomEvent("error", {
          detail: {
            message: "Error initiating session",
            details: e instanceof Error ? e.message : String(e),
          },
        }),
      );
    }
  });

  // Move all other event listeners outside createSession so they're available immediately
  target.addEventListener("setTool", (e: Event) => {
    // @ts-ignore
    const tools: Array<toolDefinition> = e.detail;
    
    // Only set tools if client exists
    if (!bedrockClient) {
      console.warn("Cannot set tools: Bedrock client not initialized");
      return;
    }
    
    for(let tool of tools){
      bedrockClient.setTool(tool.name, tool.specs, tool.action);
    }
  });

  // Simplified audioInput handler without rate limiting
  target.addEventListener("audioInput", async (e) => {
    if (!session) {
      console.error("No active session for audioInput");
      return;
    }
    
    // @ts-ignore
    const audioData = e.detail;
    try {
      // Convert base64 string to Buffer
      const audioBuffer =
        typeof audioData === "string"
          ? Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))
          : new TextEncoder().encode(audioData);

      // Stream the audio
      await session.streamAudio(audioBuffer);
    } catch (error) {
      console.error("Error processing audio:", error);
      target.dispatchEvent(
        new CustomEvent("error", {
          detail: {
            message: "Error processing audio",
            details: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  });

  target.addEventListener("promptStart", async () => {
    if (!session) {
      console.error("No active session for promptStart");
      return;
    }
    
    try {
      console.log("Prompt start received");
      await session.setupPromptStart();
    } catch (error) {
      console.error("Error processing prompt start:", error);
      target.dispatchEvent(
        new CustomEvent("error", {
          detail: {
            message: "Error processing prompt start",
            details: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  });

  target.addEventListener("systemPrompt", async (e) => {
    if (!session) {
      console.error("No active session for systemPrompt");
      return;
    }
    
    // @ts-ignore
    const data = e.detail;
    try {
      console.log("System prompt received", data);
      await session.setupSystemPrompt(undefined, data);
    } catch (error) {
      console.error("Error processing system prompt:", error);
      target.dispatchEvent(
        new CustomEvent("error", {
          detail: {
            message: "Error processing system prompt",
            details: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  });

  target.addEventListener("audioStart", async (e) => {
    if (!session) {
      console.error("No active session for audioStart");
      return;
    }
    
    // @ts-ignore
    const data = e.detail;
    try {
      console.log("Audio start received", data);
      await session.setupStartAudio();
    } catch (error) {
      console.error("Error processing audio start:", error);
      target.dispatchEvent(
        new CustomEvent("error", {
          detail: {
            message: "Error processing audio start",
            details: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  });

  target.addEventListener("stopAudio", async () => {
    if (!session) {
      console.error("No active session for stopAudio");
      return;
    }
    
    try {
      console.log("Stop audio requested, beginning proper shutdown sequence");

      // Chain the closing sequence
      await Promise.all([
        session
          .endAudioContent()
          .then(() => session.endPrompt())
          .then(() => session.close())
          .then(() => {
            console.log("Session cleanup complete");
            // Reset session variables to allow new session creation
            session = null;
            sessionId = "";
          }),
      ]);
    } catch (error) {
      console.error("Error processing streaming end events:", error);
      target.dispatchEvent(
        new CustomEvent("error", {
          detail: {
            message: "Error processing streaming end events",
            details: error instanceof Error ? error.message : String(error),
          },
        }),
      );
    }
  });

  // Handle disconnection
  target.addEventListener("disconnect", async () => {
    console.log("Client disconnected abruptly:", sessionId);

    if (bedrockClient && bedrockClient.isSessionActive(sessionId)) {
      try {
        console.log(
          `Beginning cleanup for abruptly disconnected session: ${sessionId}`,
        );

        // Add explicit timeouts to avoid hanging promises
        const cleanupPromise = Promise.race([
          (async () => {
            await session.endAudioContent();
            await session.endPrompt();
            await session.close();
          })(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Session cleanup timeout")),
              3000,
            ),
          ),
        ]);

        await cleanupPromise;
        console.log(
          `Successfully cleaned up session after abrupt disconnect: ${sessionId}`,
        );
        // Reset session variables after successful cleanup
        session = null;
        sessionId = "";
      } catch (error) {
        console.error(
          `Error cleaning up session after disconnect: ${sessionId}`,
          error,
        );
        try {
          bedrockClient!.forceCloseSession(sessionId);
          console.log(`Force closed session: ${sessionId}`);
        } catch (e) {
          console.error(`Failed even force close for session: ${sessionId}`, e);
        }
      }
    }
  });

} catch (error) {
  console.error("Error creating session:", error);
  target.dispatchEvent(
    new CustomEvent("error", {
      detail: {
        message: "Failed to initialize session",
        details: error instanceof Error ? error.message : String(error),
      },
    }),
  );
}

export { target };

// Export eventsProxy object with methods
export const eventsProxy = {
  getEventTarget: () => target,
  createSession: () => {
    target.dispatchEvent(new CustomEvent("createSession"));
  },
  stopStreaming: () => {
    target.dispatchEvent(new CustomEvent("stopStreaming"));
  },
  sendAudioData: (audioData: Float32Array) => {
    target.dispatchEvent(new CustomEvent("audioData", { detail: audioData }));
  }
};
