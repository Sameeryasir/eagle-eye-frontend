import React, { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
// import { createClient } from "@supabase/supabase-js" // Disabled - using API instead
import {
    Search,
    MoreHorizontal,
    Paperclip,
    Send,
    Smile,
    ChevronDown,
    FileText,
    PenTool,
    Image as ImageIcon,
    CheckCircle2,
    X,
    Calendar as CalendarIcon,
    Type as TypeIcon,
    StickyNote as StickyIcon,
    Menu, // ⟵ added for mobile sidebar toggle
    Plus, // ⟵ added for FAB button
} from "lucide-react"
// Note: Direct API implementation for Framer Motion component
// Cannot use React Native imports in Framer Motion

const BUILD_TAG = "ContractorComms v1.4.0 (invites,no-deps, responsive)"

// ── API Configuration ──────────────────────────────────────────────────────
const API_URL = "https://api.eagle-eye.ca" // Replace with your API URL

// ── Supabase client ─────────────────────────────────────────────────────────
// Note: Supabase client disabled - using API instead
// const supabase = createClient("YOUR_SUPABASE_URL", "YOUR_SUPABASE_ANON_KEY")

// ── Helper Functions ────────────────────────────────────────────────────────
// Get current user ID from localStorage
const getCurrentUserId = () => {
    try {
        const userData = localStorage.getItem("user")

        if (userData) {
            const user = JSON.parse(userData)
            return user.id ? user.id.toString() : null
        }
        return null
    } catch (error) {
        console.error("Error getting current user ID:", error)
        return null
    }
}

// Check if file is an image
const isImageFile = (fileName) => {
    if (!fileName) return false
    const extension = fileName.split(".").pop().toLowerCase()
    return ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(
        extension
    )
}

// Get file icon based on file name extension
const getFileIcon = (fileName) => {
    if (!fileName) return "📄"

    // Get file extension
    const extension = fileName.split(".").pop().toLowerCase()

    // Images
    if (
        ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].includes(extension)
    ) {
        return "🖼️"
    }

    // PDFs
    if (extension === "pdf") return "📕"

    // Word Documents
    if (["doc", "docx"].includes(extension)) {
        return "📝"
    }

    // Excel Documents
    if (["xls", "xlsx"].includes(extension)) {
        return "📊"
    }

    // PowerPoint Documents
    if (["ppt", "pptx"].includes(extension)) {
        return "📽️"
    }

    // Text Files
    if (["txt", "md", "rtf"].includes(extension)) {
        return "📄"
    }

    // Archives
    if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) {
        return "📦"
    }

    // Videos
    if (["mp4", "avi", "mov", "wmv", "flv", "webm"].includes(extension)) {
        return "🎥"
    }

    // Audio
    if (["mp3", "wav", "flac", "aac", "ogg"].includes(extension)) {
        return "🎵"
    }

    // Default icon for unknown types
    return "📄"
}

// ── API Functions ───────────────────────────────────────────────────────────
// Fetch files for a conversation using fetch API
const getFilesForConversation = async (conversationId) => {
    try {
        // Get token from localStorage with correct token names
        const token = localStorage.getItem("access_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        if (!conversationId) {
            throw new Error("Conversation ID is required")
        }

        const response = await fetch(
            `${API_URL}/chat/conversations/${conversationId}/files`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        )

        if (!response.ok) {
            if (response.status === 401) {
                // Handle token refresh if needed
                const refreshTokenValue = localStorage.getItem("refresh_token")
                if (refreshTokenValue) {
                    try {
                        console.log("🔄 Token expired, attempting refresh...")
                        const newToken =
                            await refreshAccessToken(refreshTokenValue)
                        console.log("✅ Token refreshed successfully")

                        // Retry the original request with new token
                        const retryResponse = await fetch(
                            `${API_URL}/chat/conversations/${conversationId}/files`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization: `Bearer ${newToken}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        )

                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json()
                            return retryData
                        }
                    } catch (refreshError) {
                        console.error("❌ Token refresh failed:", refreshError)
                        throw new Error("Token expired and refresh failed")
                    }
                }
                throw new Error("Authentication failed")
            }
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error fetching conversation files:", error)
        throw error
    }
}

// Fetch conversations using fetch API
const getConversations = async () => {
    try {
        // Get token from localStorage with correct token names
        const token = localStorage.getItem("access_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        const response = await fetch(`${API_URL}/chat/conversations`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            if (response.status === 401) {
                // Handle token refresh if needed
                const refreshTokenValue = localStorage.getItem("refresh_token")
                if (refreshTokenValue) {
                    try {
                        console.log("🔄 Token expired, attempting refresh...")
                        const newToken =
                            await refreshAccessToken(refreshTokenValue)
                        console.log("✅ Token refreshed successfully")

                        // Retry the original request with new token
                        const retryResponse = await fetch(
                            `${API_URL}/chat/conversations`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization: `Bearer ${newToken}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        )

                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json()
                            return retryData
                        }
                    } catch (refreshError) {
                        console.error("❌ Token refresh failed:", refreshError)
                        throw new Error("Token expired and refresh failed")
                    }
                }
                throw new Error("Authentication failed")
            }
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error fetching conversations:", error)
        throw error
    }
}

// Fetch messages by conversation ID using fetch API
const getMessagesByConversationId = async (conversationId) => {
    try {
        // Get token from localStorage with correct token names
        const token = localStorage.getItem("access_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        if (!conversationId) {
            throw new Error("Conversation ID is required")
        }

        const response = await fetch(
            `${API_URL}/chat/conversations/${conversationId}/messages`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        )

        if (!response.ok) {
            if (response.status === 401) {
                // Handle token refresh if needed
                const refreshTokenValue = localStorage.getItem("refresh_token")
                if (refreshTokenValue) {
                    try {
                        console.log("🔄 Token expired, attempting refresh...")
                        const newToken =
                            await refreshAccessToken(refreshTokenValue)
                        console.log("✅ Token refreshed successfully")

                        // Retry the original request with new token
                        const retryResponse = await fetch(
                            `${API_URL}/chat/conversations/${conversationId}/messages`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization: `Bearer ${newToken}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        )

                        if (retryResponse.ok) {
                            const retryData = await retryResponse.json()
                            return retryData
                        }
                    } catch (refreshError) {
                        console.error("❌ Token refresh failed:", refreshError)
                        throw new Error("Token expired and refresh failed")
                    }
                }
                throw new Error("Authentication failed")
            }
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error) {
        console.error("Error fetching conversation messages:", error)
        throw error
    }
}

// --- Pusher Client Configuration (MCP Context 7) ---
// Real-time chat functionality with Pusher
// Business Rule: Configure with your Pusher credentials

// Simple Pusher configuration
const PUSHER_KEY = "2a365c8d4fd51cd8b223"
const PUSHER_CLUSTER = "ap2"

// Token refresh function (inline implementation)
const refreshAccessToken = async (refreshTokenValue) => {
    try {
        if (!refreshTokenValue) {
            throw new Error("No refresh token found")
        }

        const response = await fetch(`${API_URL}/auth/refresh-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                refreshToken: refreshTokenValue,
            }),
        })

        if (!response.ok) {
            throw new Error("Failed to refresh token")
        }

        const data = await response.json()

        if (data.access_token) {
            localStorage.setItem("access_token", data.access_token)
        }
        if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token)
        }

        return data.access_token
    } catch (error) {
        console.error("Error refreshing token:", error)
        // Clear tokens on refresh failure
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        throw error
    }
}

// Fetch projects API function
const getMyProjects = async () => {
    try {
        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        console.log("🔍 Fetching projects...")
        console.log("🌐 Using API_URL:", API_URL)
        console.log("🎯 Full endpoint:", `${API_URL}/project`)

        const response = await fetch(`${API_URL}/project`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        })

        if (!response.ok) {
            if (response.status === 401 && refreshToken) {
                try {
                    console.log("🔄 Token expired, attempting refresh...")
                    const newToken = await refreshAccessToken(refreshToken)
                    console.log("✅ Token refreshed successfully")

                    // Retry the original request with new token
                    const retryResponse = await fetch(`${API_URL}/project`, {
                        method: "GET",
                        headers: {
                            Authorization: `Bearer ${newToken}`,
                            "Content-Type": "application/json",
                        },
                    })

                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json()
                        console.log(
                            "✅ Projects fetched successfully (after refresh):",
                            retryData
                        )
                        return retryData
                    }
                } catch (refreshError) {
                    console.error("❌ Token refresh failed:", refreshError)
                    throw new Error("Token expired and refresh failed")
                }
            }
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("✅ Projects fetched successfully:", data)
        return data
    } catch (error) {
        console.error("❌ Error fetching projects:", error)
        throw error
    }
}

// Fetch employees assigned to project API function
const getEmployeesAssignedToProject = async (projectId) => {
    try {
        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        console.log("🔍 Fetching employees assigned to project:", projectId)
        console.log("🌐 Using API_URL:", API_URL)
        console.log(
            "🎯 Full endpoint:",
            `${API_URL}/project/employeesassigned/${projectId}`
        )

        const response = await fetch(
            `${API_URL}/project/employeesassigned/${projectId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        )

        if (!response.ok) {
            if (response.status === 401 && refreshToken) {
                try {
                    console.log("🔄 Token expired, attempting refresh...")
                    const newToken = await refreshAccessToken(refreshToken)
                    console.log("✅ Token refreshed successfully")

                    // Retry the original request with new token
                    const retryResponse = await fetch(
                        `${API_URL}/project/employeesassigned/${projectId}`,
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${newToken}`,
                                "Content-Type": "application/json",
                            },
                        }
                    )

                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json()
                        console.log(
                            "✅ Project employees fetched successfully (after refresh):",
                            retryData
                        )
                        return retryData
                    }
                } catch (refreshError) {
                    console.error("❌ Token refresh failed:", refreshError)
                    throw new Error("Token expired and refresh failed")
                }
            }
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("✅ Project employees fetched successfully:", data)
        return data
    } catch (error) {
        console.error("❌ Error fetching project employees:", error)
        throw error
    }
}

// Create project conversation API function
const createProjectConversation = async (projectId) => {
    try {
        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        if (!projectId) {
            throw new Error("Project ID is required")
        }

        console.log("=== Creating Project Conversation ===")
        console.log("Project ID:", projectId)
        console.log("🌐 Using API_URL:", API_URL)
        console.log(
            "🎯 Full endpoint:",
            `${API_URL}/chat/project-conversations/${projectId}`
        )

        const response = await fetch(
            `${API_URL}/chat/project-conversations/${projectId}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}), // Empty body since projectId is in URL
            }
        )

        if (!response.ok) {
            if (response.status === 401 && refreshToken) {
                try {
                    console.log("🔄 Token expired, attempting refresh...")
                    const newToken = await refreshAccessToken(refreshToken)
                    console.log("✅ Token refreshed successfully")

                    // Retry the original request with new token
                    const retryResponse = await fetch(
                        `${API_URL}/chat/project-conversations/${projectId}`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${newToken}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({}),
                        }
                    )

                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json()
                        console.log(
                            "✅ Project conversation created successfully (after refresh):",
                            retryData
                        )
                        return retryData
                    } else {
                        // Handle error in retry response
                        const errorData = await retryResponse.json()
                        console.error("❌ Retry API Error Response:", errorData)

                        // Show the exact API response message
                        let errorMessage = ""
                        if (errorData.message) {
                            errorMessage = errorData.message
                        } else if (errorData.error) {
                            errorMessage = errorData.error
                        } else if (errorData.details) {
                            errorMessage = errorData.details
                        } else if (typeof errorData === "string") {
                            errorMessage = errorData
                        } else {
                            // Try to extract message from nested objects
                            errorMessage = JSON.stringify(errorData)
                        }

                        throw new Error(
                            errorMessage ||
                                `HTTP error! status: ${retryResponse.status}`
                        )
                    }
                } catch (refreshError) {
                    console.error("❌ Token refresh failed:", refreshError)
                    throw new Error("Token expired and refresh failed")
                }
            } else {
                // Handle 400 and other errors
                try {
                    const errorData = await response.json()
                    console.error("❌ API Error Response:", errorData)

                    // Show the exact API response message
                    let errorMessage = ""
                    if (errorData.message) {
                        errorMessage = errorData.message
                    } else if (errorData.error) {
                        errorMessage = errorData.error
                    } else if (errorData.details) {
                        errorMessage = errorData.details
                    } else if (typeof errorData === "string") {
                        errorMessage = errorData
                    } else {
                        // Try to extract message from nested objects
                        errorMessage = JSON.stringify(errorData)
                    }

                    console.log("🔍 Extracted error message:", errorMessage)
                    console.log("🔍 Full error data:", errorData)

                    throw new Error(
                        errorMessage || `HTTP error! status: ${response.status}`
                    )
                } catch (parseError) {
                    console.error(
                        "❌ Failed to parse error response:",
                        parseError
                    )
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
            }
        }

        const data = await response.json()
        console.log("✅ Project conversation created successfully:", data)
        return data
    } catch (error) {
        console.error("❌ Error creating project conversation:", error)
        throw error
    }
}

// Create conversation API function
const createConversation = async (conversationData) => {
    try {
        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        // Validation: Ensure participantIds array is provided
        if (
            !conversationData ||
            !conversationData.participantIds ||
            conversationData.participantIds.length === 0
        ) {
            throw new Error("At least one participant is required")
        }

        // Prepare request body matching CreateConversationDto
        const requestBody = {
            type: conversationData.type || "private", // Default to "private" if not specified
            participantIds: conversationData.participantIds, // Array of user IDs
        }

        console.log("=== Creating Conversation ===")
        console.log("Type:", requestBody.type)
        console.log("Participant IDs:", requestBody.participantIds)
        console.log("🌐 Using API_URL:", API_URL)
        console.log("🎯 Full endpoint:", `${API_URL}/chat/conversations`)

        const response = await fetch(`${API_URL}/chat/conversations`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            if (response.status === 401 && refreshToken) {
                try {
                    console.log("🔄 Token expired, attempting refresh...")
                    const newToken = await refreshAccessToken(refreshToken)
                    console.log("✅ Token refreshed successfully")

                    // Retry the original request with new token
                    const retryResponse = await fetch(
                        `${API_URL}/chat/conversations`,
                        {
                            method: "POST",
                            headers: {
                                Authorization: `Bearer ${newToken}`,
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(requestBody),
                        }
                    )

                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json()
                        console.log(
                            "✅ Conversation created successfully (after refresh):",
                            retryData
                        )
                        return retryData
                    } else {
                        // Handle error in retry response
                        const errorData = await retryResponse.json()
                        console.error("❌ Retry API Error Response:", errorData)

                        // Show the exact API response message
                        let errorMessage = ""
                        if (errorData.message) {
                            errorMessage = errorData.message
                        } else if (errorData.error) {
                            errorMessage = errorData.error
                        } else if (errorData.details) {
                            errorMessage = errorData.details
                        } else if (typeof errorData === "string") {
                            errorMessage = errorData
                        } else {
                            // Try to extract message from nested objects
                            errorMessage = JSON.stringify(errorData)
                        }

                        throw new Error(
                            errorMessage ||
                                `HTTP error! status: ${retryResponse.status}`
                        )
                    }
                } catch (refreshError) {
                    console.error("❌ Token refresh failed:", refreshError)
                    throw new Error("Token expired and refresh failed")
                }
            } else {
                // Handle 400 and other errors
                try {
                    const errorData = await response.json()
                    console.error("❌ API Error Response:", errorData)

                    // Show the exact API response message
                    let errorMessage = ""
                    if (errorData.message) {
                        errorMessage = errorData.message
                    } else if (errorData.error) {
                        errorMessage = errorData.error
                    } else if (errorData.details) {
                        errorMessage = errorData.details
                    } else if (typeof errorData === "string") {
                        errorMessage = errorData
                    } else {
                        // Try to extract message from nested objects
                        errorMessage = JSON.stringify(errorData)
                    }

                    console.log("🔍 Extracted error message:", errorMessage)
                    console.log("🔍 Full error data:", errorData)

                    throw new Error(
                        errorMessage || `HTTP error! status: ${response.status}`
                    )
                } catch (parseError) {
                    console.error(
                        "❌ Failed to parse error response:",
                        parseError
                    )
                    throw new Error(`HTTP error! status: ${response.status}`)
                }
            }
        }

        const data = await response.json()
        console.log("✅ Conversation created successfully:", data)
        return data
    } catch (error) {
        console.error("❌ Error creating conversation:", error)
        throw error
    }
}

// Fetch employees for conversation API function
const getEmployeesForConversation = async () => {
    try {
        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        console.log("🔍 Fetching employees for conversation...")
        console.log("🌐 Using localhost:3000")
        console.log(
            "🎯 Full endpoint:",
            `http://localhost:3000/user/employees-for-conversation`
        )

        const response = await fetch(
            `http://localhost:3000/user/employees-for-conversation`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        )

        if (!response.ok) {
            if (response.status === 401 && refreshToken) {
                try {
                    console.log("🔄 Token expired, attempting refresh...")
                    const newToken = await refreshAccessToken(refreshToken)
                    console.log("✅ Token refreshed successfully")

                    // Retry the original request with new token
                    const retryResponse = await fetch(
                        `http://localhost:3000/user/employees-for-conversation`,
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${newToken}`,
                                "Content-Type": "application/json",
                            },
                        }
                    )

                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json()
                        console.log(
                            "✅ Employees fetched successfully (after refresh):",
                            retryData
                        )
                        return retryData
                    }
                } catch (refreshError) {
                    console.error("❌ Token refresh failed:", refreshError)
                    throw new Error("Token expired and refresh failed")
                }
            }
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("✅ Employees fetched successfully:", data)
        return data
    } catch (error) {
        console.error("❌ Error fetching employees:", error)
        throw error
    }
}

// Send message API function (integrated directly)
const sendMessageToConversation = async (
    conversationId,
    content,
    file = null
) => {
    try {
        // Get token from localStorage
        const token = localStorage.getItem("access_token")
        const refreshToken = localStorage.getItem("refresh_token")

        if (!token) {
            throw new Error("No authentication token found")
        }

        if (!conversationId) {
            throw new Error("Conversation ID is required")
        }

        if ((!content || !content.trim()) && !file) {
            throw new Error("Message content or file is required")
        }

        console.log("=== Sending Message ===")
        console.log("Conversation ID:", conversationId)
        console.log("Content:", content)
        console.log("File:", file ? `${file.name} (${file.type})` : "None")

        // Prepare request body and headers
        let requestBody
        let headers = {
            Authorization: `Bearer ${token}`,
        }

        if (file) {
            // Use FormData for file uploads
            requestBody = new FormData()
            requestBody.append("conversationId", conversationId.toString())

            if (content && content.trim()) {
                requestBody.append("content", content.trim())
            }

            // Append file for web (File object)
            requestBody.append("file", file)

            console.log("Using FormData with file attachment")
        } else {
            // Use JSON for text-only messages
            requestBody = {
                conversationId: conversationId,
                content: content.trim(),
            }

            headers["Content-Type"] = "application/json"

            console.log("Using JSON for text-only message")
        }

        const response = await fetch(`${API_URL}/chat/messages`, {
            method: "POST",
            headers: headers,
            body: file ? requestBody : JSON.stringify(requestBody),
        })

        if (!response.ok) {
            if (response.status === 401 && refreshToken) {
                try {
                    console.log("🔄 Token expired, attempting refresh...")
                    const newToken = await refreshAccessToken(refreshToken)
                    console.log("✅ Token refreshed successfully")

                    // Retry the original request with new token
                    const retryResponse = await fetch(
                        `${API_URL}/chat/messages`,
                        {
                            method: "POST",
                            headers: file
                                ? {
                                      Authorization: `Bearer ${newToken}`,
                                  }
                                : {
                                      Authorization: `Bearer ${newToken}`,
                                      "Content-Type": "application/json",
                                  },
                            body: file
                                ? requestBody
                                : JSON.stringify(requestBody),
                        }
                    )

                    if (retryResponse.ok) {
                        const retryData = await retryResponse.json()
                        console.log(
                            "✅ Message sent successfully (after refresh):",
                            retryData
                        )
                        return retryData
                    }
                } catch (refreshError) {
                    console.error("❌ Token refresh failed:", refreshError)
                    throw new Error("Token expired and refresh failed")
                }
            }
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log("✅ Message sent successfully:", data)
        return data
    } catch (error) {
        console.error("❌ Error sending message:", error)
        throw error
    }
}

// Note: Type definitions removed since this is a JavaScript file, not TypeScript
// The API response structure should match the expected format:
// User: { id, email, first_name, last_name, title, dob, phone }
// Participant: { id, user, joinedAt }
// Message: { id, sender, content, fileUrl, fileName, fileSize, fileType, createdAt, status }
// Project: { id, name, description, startDate, createdAt }
// Conversation: { id, type, project, messages, participants, createdAt }
// Contact: { id, name, avatar_url }
// ProjFile: { id, project_id, name, url, created_at }
// ProjDrawing: { id, project_id, name, url, created_at }
// Signature: { id, project_id, message_id, signer, signature_url, created_at }

export default function ContractorCommunications({ currentUser = "Me" }) {
    const ACCENT = "#3155a1"

    // ── State ────────────────────────────────────────────────────────────────
    const [conversations, setConversations] = useState([])
    const [activeConversation, setActiveConversation] = useState(null)
    const [loadingConversations, setLoadingConversations] = useState(true)

    const [contacts, setContacts] = useState([])
    const [selectedContact, setSelectedContact] = useState(null)

    // Search functionality
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredContacts, setFilteredContacts] = useState([])
    const [isSearching, setIsSearching] = useState(false)

    const [messages, setMessages] = useState([])

    // Function to subscribe to individual signature channels
    const subscribeToIndividualSignatureChannels = (
        messages,
        pusherInstance
    ) => {
        if (!pusherInstance || !messages || messages.length === 0) {
            return
        }

        messages.forEach((message) => {
            const signatureId = message.signature?.id || message.signatureId
            const signatureStatus = message.signature?.status || message.status

            if (signatureId && signatureStatus === "pending") {
                const signatureChannelName = `signature-${signatureId}`

                try {
                    const signatureChannel =
                        pusherInstance.subscribe(signatureChannelName)

                    signatureChannel.bind("signature-file-uploaded", (data) => {
                        console.log(
                            "📝 File uploaded for signature:",
                            signatureId
                        )
                        setMessages((prevMessages) => {
                            return prevMessages.map((msg) => {
                                const msgSignatureId =
                                    msg.signature?.id || msg.signatureId
                                if (msgSignatureId === signatureId) {
                                    return {
                                        ...msg,
                                        signature: {
                                            ...msg.signature,
                                            status: "signed",
                                            fileUrl:
                                                data.fileUrl || data.file_url,
                                        },
                                        status: "signed",
                                        fileUrl: data.fileUrl || data.file_url,
                                        completedViaPusher: true,
                                    }
                                }
                                return msg
                            })
                        })
                    })
                } catch (error) {
                    console.error(
                        "❌ Error subscribing to signature channel:",
                        error
                    )
                }
            }
        })
    }
    const [loadingMessages, setLoadingMessages] = useState(false)
    const [draft, setDraft] = useState("")
    const [attachment, setAttachment] = useState(null)

    const [showEmojiPicker, setShowEmojiPicker] = useState(false)

    const [headerTab, setHeaderTab] = useState("files")
    const [projFiles, setProjFiles] = useState([])
    const [projDrawings, setProjDrawings] = useState([])
    const [projSignatures, setProjSignatures] = useState([])
    const [loadingFiles, setLoadingFiles] = useState(false)
    const [loadingSignatures, setLoadingSignatures] = useState(false)
    

    const [showSignModal, setShowSignModal] = useState(false)
    const [signForMessage, setSignForMessage] = useState(null)
    const [hasSavedSignature, setHasSavedSignature] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    // Request signature flow
    const [showRequestModal, setShowRequestModal] = useState(false)
    const [reqTitle, setReqTitle] = useState("")
    const [reqNotes, setReqNotes] = useState("")
    const [reqDue, setReqDue] = useState("")

    // Invite flow
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteBusy, setInviteBusy] = useState(false)
    const [inviteError, setInviteError] = useState(null)
    const [inviteLink, setInviteLink] = useState(null)

    // NEW: responsive sidebar toggle
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // FAB Modal state
    const [showFabModal, setShowFabModal] = useState(false)
    const [employees, setEmployees] = useState([])
    const [loadingEmployees, setLoadingEmployees] = useState(false)
    const [employeeSearchQuery, setEmployeeSearchQuery] = useState("")
    const [filteredEmployees, setFilteredEmployees] = useState([])

    // Project selection state
    const [showProjectModal, setShowProjectModal] = useState(false)
    const [projects, setProjects] = useState([])
    const [loadingProjects, setLoadingProjects] = useState(false)
    const [selectedProject, setSelectedProject] = useState(null)

    // Conversation creation state
    const [creatingConversation, setCreatingConversation] = useState(false)
    const [creatingForEmployee, setCreatingForEmployee] = useState(null)
    const [conversationError, setConversationError] = useState(null)
    const [creatingProjectConversation, setCreatingProjectConversation] =
        useState(false)
    const [projectConversationError, setProjectConversationError] =
        useState(null)

    // Pusher state - simplified
    const [pusherReady, setPusherReady] = useState(false)

    const chatEndRef = useRef(null)
    const canvasRef = useRef(null)
    const isDrawingRef = useRef(false)
    const lastPointRef = useRef(null)
    const channelsRef = useRef({})

    // ── Load conversations from API ──────────────────────────────────────────
    useEffect(() => {
        const fetchConversations = async () => {
            console.log("🔄 Starting to fetch conversations...")

            // Debug: Check authentication tokens
            const accessToken = localStorage.getItem("access_token")
            const refreshToken = localStorage.getItem("refresh_token")
            console.log("🔑 Authentication tokens:", {
                hasAccessToken: !!accessToken,
                hasRefreshToken: !!refreshToken,
                accessTokenLength: accessToken?.length || 0,
                refreshTokenLength: refreshToken?.length || 0,
            })

            setLoadingConversations(true)
            try {
                const conversationsData = await getConversations()
                console.log(
                    "✅ Fetched conversations successfully:",
                    conversationsData
                )

                if (conversationsData && conversationsData.length > 0) {
                    // Sort conversations by the latest message timestamp (newest first)
                    const sortedConversations = conversationsData.sort(
                        (a, b) => {
                            const aLastMessage =
                                a.messages?.[a.messages.length - 1]
                            const bLastMessage =
                                b.messages?.[b.messages.length - 1]

                            if (!aLastMessage && !bLastMessage) return 0
                            if (!aLastMessage) return 1
                            if (!bLastMessage) return -1

                            return (
                                new Date(bLastMessage.createdAt).getTime() -
                                new Date(aLastMessage.createdAt).getTime()
                            )
                        }
                    )

                    console.log(
                        "📊 Sorted conversations by latest message:",
                        sortedConversations.map((c) => ({
                            id: c.id,
                            type: c.type,
                            lastMessageTime:
                                c.messages?.[c.messages.length - 1]
                                    ?.createdAt || "No messages",
                        }))
                    )

                    setConversations(sortedConversations)

                    // Don't auto-select any conversation - let user choose
                    // setActiveConversation(sortedConversations[0].id);

                    // Transform conversations to contacts for the sidebar
                    const contactsList: Contact[] = []
                    sortedConversations.forEach((conv) => {
                        if (conv.type === "group" && conv.project) {
                            // Group chat - show project name
                            const projectName = conv.project.name
                            const initials = projectName
                                .split(" ")
                                .map((word) => word.charAt(0))
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)
                            contactsList.push({
                                id: `group_${conv.id}`,
                                name: projectName,
                                avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(projectName)}&background=3155a1&color=fff`,
                            })
                        } else if (conv.type === "private") {
                            // Private chat - show other user (not current user)
                            const otherParticipant = conv.participants.find(
                                (p) => p.user.id.toString() !== currentUser
                            )
                            if (otherParticipant) {
                                const userName = `${otherParticipant.user.first_name} ${otherParticipant.user.last_name}`
                                contactsList.push({
                                    id: otherParticipant.user.id.toString(),
                                    name: userName,
                                    avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3155a1&color=fff`,
                                })
                            }
                        }
                    })
                    setContacts(contactsList)
                } else {
                    setConversations([])
                    setContacts([])
                }
            } catch (error) {
                console.error("Failed to fetch conversations:", error)
                setConversations([])
                setContacts([])
            } finally {
                setLoadingConversations(false)
            }
        }

        fetchConversations()
    }, [])

    // ── Pusher Real-time Setup ──────────────────────────────────────────────────
    useEffect(() => {
        console.log("🔧 Starting Pusher setup...")

        // ✅ Dynamically load the Pusher script if not loaded yet
        if (!window.Pusher) {
            console.log("📦 Pusher not found, loading script...")
            const script = document.createElement("script")
            script.src = "https://js.pusher.com/8.2/pusher.min.js"
            script.async = true
            script.onload = () => {
                console.log("✅ Pusher SDK loaded dynamically")
                console.log("🔍 window.Pusher available:", !!window.Pusher)
                console.log(
                    "🔍 Pusher version:",
                    window.Pusher?.VERSION || "unknown"
                )
                setPusherReady(true)
            }
            script.onerror = (error) => {
                console.error("❌ Failed to load Pusher SDK:", error)
            }
            document.head.appendChild(script)
            console.log("📝 Script element added to document head")
        } else {
            console.log("✅ Pusher already available")
            console.log("🔍 window.Pusher available:", !!window.Pusher)
            console.log(
                "🔍 Pusher version:",
                window.Pusher?.VERSION || "unknown"
            )
            setPusherReady(true)
        }
    }, [])

    // ── Subscribe to ALL Conversation Channels ───────────────────────────────────────
    useEffect(() => {
        console.log("🔄 Pusher effect triggered with:", {
            pusherReady,
            hasWindowPusher: !!window.Pusher,
            conversationsCount: conversations.length,
            pusherKey: PUSHER_KEY,
            pusherCluster: PUSHER_CLUSTER,
        })

        if (!pusherReady || !window.Pusher) {
            console.log("⏸️ Skipping Pusher initialization - not ready:", {
                pusherReady,
                hasWindowPusher: !!window.Pusher,
            })
            return
        }

        console.log("⚡ Initializing Pusher connection...")
        console.log("🔑 Using Pusher Key:", PUSHER_KEY)
        console.log("🌐 Using Pusher Cluster:", PUSHER_CLUSTER)

        const pusher = new window.Pusher(PUSHER_KEY, {
            cluster: PUSHER_CLUSTER,
            forceTLS: true,
        })

        // Store pusher instance globally so it can be accessed from other parts of the code
        window.pusherInstance = pusher

        console.log("🔗 Pusher instance created:", pusher)

        // Check if there are pending signatures waiting to be subscribed
        if (window.pendingSignaturesForSubscription) {
            const pendingSignatures = window.pendingSignaturesForSubscription
            console.log(
                "📋 Signatures to subscribe:",
                pendingSignatures
                    .map((msg) => {
                        const signatureId = msg.signature?.id || msg.signatureId
                        return `signature-${signatureId}`
                    })
                    .join(", ")
            )

            pendingSignatures.forEach((msg) => {
                const signatureId = msg.signature?.id || msg.signatureId
                const signatureChannelName = `signature-${signatureId}`

                try {
                    const signatureChannel =
                        pusher.subscribe(signatureChannelName)

                    signatureChannel.bind("signature-file-uploaded", (data) => {
                        console.log(
                            "📝 File uploaded for signature:",
                            signatureId
                        )
                        setMessages((prevMessages) => {
                            return prevMessages.map((prevMsg) => {
                                const msgSignatureId =
                                    prevMsg.signature?.id || prevMsg.signatureId
                                if (msgSignatureId === signatureId) {
                                    return {
                                        ...prevMsg,
                                        signature: {
                                            ...prevMsg.signature,
                                            status: "signed",
                                            fileUrl:
                                                data.fileUrl || data.file_url,
                                        },
                                        status: "signed",
                                        fileUrl: data.fileUrl || data.file_url,
                                        completedViaPusher: true,
                                    }
                                }
                                return prevMsg
                            })
                        })
                    })
                } catch (error) {
                    console.error(
                        "❌ Error subscribing to signature channel:",
                        error
                    )
                }
            })

            window.pendingSignaturesForSubscription = null
        }

        // Get current user ID for user-specific channel
        const currentUserId = getCurrentUserId()
        console.log("👤 Current user ID for Pusher:", currentUserId)

        // Subscribe to user-specific channel for new conversations
        if (currentUserId) {
            const userChannelName = `user-${currentUserId}`
            console.log("📡 Subscribing to user channel:", userChannelName)
            const userChannel = pusher.subscribe(userChannelName)

            // Listen for new conversations
            userChannel.bind("new-conversation", (conversationData) => {
                console.log(
                    "🆕 New conversation received via Pusher:",
                    conversationData
                )

                // Add the new conversation to the list
                setConversations((prevConversations) => {
                    // Check if conversation already exists to avoid duplicates
                    const exists = prevConversations.some(
                        (conv) => conv.id === conversationData.id
                    )
                    if (exists) {
                        console.log(
                            "⚠️ Conversation already exists, skipping duplicate"
                        )
                        return prevConversations
                    }

                    console.log("➕ Adding new conversation to list")
                    const updatedConversations = [
                        ...prevConversations,
                        conversationData,
                    ]

                    // Sort by latest message timestamp (newest first)
                    const sortedConversations = updatedConversations.sort(
                        (a, b) => {
                            const aLastMessage =
                                a.messages?.[a.messages.length - 1]
                            const bLastMessage =
                                b.messages?.[b.messages.length - 1]

                            if (!aLastMessage && !bLastMessage) return 0
                            if (!aLastMessage) return 1
                            if (!bLastMessage) return -1

                            return (
                                new Date(bLastMessage.createdAt).getTime() -
                                new Date(aLastMessage.createdAt).getTime()
                            )
                        }
                    )

                    return sortedConversations
                })

                // Update contacts list with the new conversation
                setContacts((prevContacts) => {
                    const newContact =
                        conversationData.type === "group" &&
                        conversationData.project
                            ? {
                                  id: `group_${conversationData.id}`,
                                  name: conversationData.project.name,
                                  avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationData.project.name)}&background=3155a1&color=fff`,
                              }
                            : conversationData.type === "private"
                              ? (() => {
                                    const otherParticipant =
                                        conversationData.participants.find(
                                            (p) =>
                                                p.user.id.toString() !==
                                                currentUserId
                                        )
                                    if (otherParticipant) {
                                        const userName = `${otherParticipant.user.first_name} ${otherParticipant.user.last_name}`
                                        return {
                                            id: otherParticipant.user.id.toString(),
                                            name: userName,
                                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3155a1&color=fff`,
                                        }
                                    }
                                    return null
                                })()
                              : null

                    if (newContact) {
                        console.log(
                            "➕ Adding new contact to list:",
                            newContact
                        )
                        return [...prevContacts, newContact]
                    }

                    return prevContacts
                })

                // Subscribe to the new conversation's channel
                const newChannelName = `conversation-${conversationData.id}`
                console.log(
                    "📡 Subscribing to new conversation channel:",
                    newChannelName
                )
                channelsRef.current[conversationData.id] =
                    pusher.subscribe(newChannelName)

                // Set up event listeners for the new channel
                const newChannel = channelsRef.current[conversationData.id]

                // Listen for new messages
                newChannel.bind("new-message", (data) => {
                    console.log(
                        "📨 New message received via Pusher from new conversation:",
                        data
                    )
                    console.log("📨 New conversation message details:", {
                        id: data.id,
                        sender: data.sender,
                        content: data.content,
                        fileUrl: data.fileUrl,
                        fileName: data.fileName,
                        fileType: data.fileType,
                        fileSize: data.fileSize,
                        createdAt: data.createdAt,
                    })

                    const messageUserId = getCurrentUserId()

                    // Only add to current messages if this is the active conversation
                    if (parseInt(conversationData.id) === activeConversation) {
                        setMessages((prevMessages) => {
                            const messageExists = prevMessages.some(
                                (msg) => msg.id === data.id
                            )
                            if (messageExists) {
                                return prevMessages
                            }
                            return [...prevMessages, data]
                        })
                    }

                    // Update conversations list with the new message and sort
                    setConversations((prevConversations) => {
                        const updatedConversations = prevConversations.map(
                            (conv) => {
                                if (conv.id === conversationData.id) {
                                    return {
                                        ...conv,
                                        messages: [
                                            ...(conv.messages || []),
                                            data,
                                        ],
                                    }
                                }
                                return conv
                            }
                        )

                        // Sort conversations by the latest message timestamp (newest first)
                        return updatedConversations.sort((a, b) => {
                            const aLastMessage =
                                a.messages?.[a.messages.length - 1]
                            const bLastMessage =
                                b.messages?.[b.messages.length - 1]

                            if (!aLastMessage && !bLastMessage) return 0
                            if (!aLastMessage) return 1
                            if (!bLastMessage) return -1

                            return (
                                new Date(bLastMessage.createdAt).getTime() -
                                new Date(aLastMessage.createdAt).getTime()
                            )
                        })
                    })
                })

                // Listen for other events
                newChannel.bind("message-updated", (data) => {
                    console.log("📝 Message updated via Pusher:", data)
                    if (parseInt(conversationData.id) === activeConversation) {
                        setMessages((prevMessages) => {
                            return prevMessages.map((msg) =>
                                msg.id === data.id ? { ...msg, ...data } : msg
                            )
                        })
                    }
                })

                newChannel.bind("typing", (data) => {
                    console.log("⌨️ Typing indicator received:", data)
                })
            })
        }

        // Subscribe to existing conversation channels
        if (conversations && conversations.length > 0) {
            console.log(
                "🔍 DEBUG: Setting up Pusher subscriptions for conversations:",
                conversations.length
            )
            channelsRef.current = channelsRef.current || {}
            conversations.forEach((conv) => {
                console.log(
                    "🔍 DEBUG: Setting up channels for conversation:",
                    conv.id
                )
                const channelName = `conversation-${conv.id}`
                console.log("📡 Subscribing to existing channel:", channelName)
                channelsRef.current[conv.id] = pusher.subscribe(channelName)
                console.log("✅ Channel subscribed:", channelName)

                // Subscribe to signature channel for this conversation
                const signatureChannelName = `conversation-signature-${conv.id}`
                console.log(
                    "📡 Subscribing to signature channel:",
                    signatureChannelName
                )
                console.log(
                    "🔍 DEBUG: Pusher connection state:",
                    pusher.connection.state
                )
                const signatureChannel = pusher.subscribe(signatureChannelName)
                console.log(
                    "✅ Signature channel subscribed:",
                    signatureChannelName,
                    signatureChannel
                )

                // Listen for signature events
                signatureChannel.bind("message-with-signature", (data) => {
                    console.log(
                        "📝 Signature message received via Pusher:",
                        data
                    )
                    console.log("🔍 DEBUG: Signature event details:", {
                        eventType: "message-with-signature",
                        channelName: signatureChannelName,
                        conversationId: conv.id,
                        activeConversation: activeConversation,
                        data: data,
                        isActiveConversation:
                            parseInt(conv.id) === activeConversation,
                    })

                    // Always update messages for any conversation
                    console.log("✅ Adding signature message to conversation")

                    setMessages((prevMessages) => {
                        console.log(
                            "🔍 DEBUG: Current messages count:",
                            prevMessages.length
                        )
                        // Check if message already exists
                        const messageExists = prevMessages.some(
                            (msg) => msg.id === data.id
                        )
                        console.log(
                            "🔍 DEBUG: Message already exists?",
                            messageExists
                        )

                        if (!messageExists) {
                            console.log(
                                "📝 Adding new signature message to messages"
                            )

                            // Subscribe to individual signature channel for this new signature
                            const signatureId =
                                data.signature?.id || data.signatureId
                            const signatureStatus =
                                data.signature?.status || data.status

                            console.log(
                                "🔍 DEBUG: New signature message details:",
                                {
                                    messageId: data.id,
                                    signatureId: signatureId,
                                    signatureStatus: signatureStatus,
                                    hasSignature: !!data.signature,
                                    hasSignatureId: !!data.signatureId,
                                }
                            )

                            if (signatureId && signatureStatus === "pending") {
                                const signatureChannelName = `signature-${signatureId}`
                                console.log(
                                    "📡 Subscribing to new individual signature channel:",
                                    signatureChannelName
                                )
                                console.log("🔍 DEBUG: New channel details:", {
                                    signatureId: signatureId,
                                    channelName: signatureChannelName,
                                    messageId: data.id,
                                })

                                const signatureChannel =
                                    pusher.subscribe(signatureChannelName)

                                // Listen for signature file upload events
                                signatureChannel.bind(
                                    "signature-file-uploaded",
                                    (uploadData) => {
                                        console.log(
                                            "📝 File uploaded for signature:",
                                            signatureId
                                        )

                                        // Update the specific message with signed status and file
                                        setMessages((prevMsgs) => {
                                            return prevMsgs.map((msg) => {
                                                const msgSignatureId =
                                                    msg.signature?.id ||
                                                    msg.signatureId
                                                if (
                                                    msgSignatureId ===
                                                    signatureId
                                                ) {
                                                    console.log(
                                                        "📝 Updating new signature status for message:",
                                                        msg.id
                                                    )
                                                    return {
                                                        ...msg,
                                                        signature: {
                                                            ...msg.signature,
                                                            status: "signed",
                                                            fileUrl:
                                                                uploadData.fileUrl ||
                                                                uploadData.file_url,
                                                        },
                                                        status: "signed",
                                                        fileUrl:
                                                            uploadData.fileUrl ||
                                                            uploadData.file_url,
                                                        completedViaPusher:
                                                            true,
                                                    }
                                                }
                                                return msg
                                            })
                                        })
                                    }
                                )

                                console.log(
                                    "✅ New individual signature channel subscribed:",
                                    signatureChannelName
                                )
                            }

                            return [...prevMessages, data]
                        }

                        console.log(
                            "⚠️ Message already exists, not adding duplicate"
                        )
                        return prevMessages
                    })

                    // Update conversations list with the new signature message and sort by newest
                    setConversations((prevConversations) => {
                        const conversationIndex = prevConversations.findIndex(
                            (conv) =>
                                conv.id?.toString() ===
                                data.conversationId?.toString()
                        )

                        if (conversationIndex === -1) {
                            return prevConversations
                        }

                        const updatedConversations = [...prevConversations]
                        const conversationToUpdate = {
                            ...updatedConversations[conversationIndex],
                        }

                        // Add signature message to conversation
                        conversationToUpdate.messages = [
                            ...(conversationToUpdate.messages || []),
                            data,
                        ]
                        conversationToUpdate.lastMessage = data
                        conversationToUpdate.lastMessageTime = data.createdAt

                        // Remove from current position and add to top (newest first)
                        updatedConversations.splice(conversationIndex, 1)
                        return [conversationToUpdate, ...updatedConversations]
                    })
                })

                // Listen for signature file upload events
                signatureChannel.bind("signature-uploaded", (data) => {
                    console.log("📝 Signature uploaded via Pusher:", data)

                    // Always update signature status for any conversation
                    console.log("✅ Updating signature status in conversation")

                    setMessages((prevMessages) => {
                        return prevMessages.map((msg) => {
                            if (msg.id === data.messageId) {
                                console.log(
                                    "📝 Updating signature status for message:",
                                    msg.id
                                )
                                return {
                                    ...msg,
                                    signature: {
                                        ...msg.signature,
                                        status: "signed",
                                        fileUrl: data.fileUrl,
                                    },
                                    completedViaPusher: true,
                                }
                            }
                            return msg
                        })
                    })
                })

                console.log(
                    "✅ Signature channel setup complete for conversation:",
                    conv.id
                )
            })

            // Subscribe to individual signature channels for pending signatures
            console.log(
                "🔍 DEBUG: Setting up individual signature channels for pending signatures"
            )

            // Get current messages and subscribe to individual signature channels
            const subscribeToSignatureChannels = (messages) => {
                console.log(
                    "🔍 DEBUG: Checking messages for pending signatures:",
                    messages.length
                )
                messages.forEach((message) => {
                    // Check if message has a signature that is pending
                    const signatureId =
                        message.signature?.id || message.signatureId
                    const signatureStatus =
                        message.signature?.status || message.status

                    console.log("🔍 DEBUG: Checking message:", {
                        messageId: message.id,
                        signatureId: signatureId,
                        signatureStatus: signatureStatus,
                        hasSignature: !!message.signature,
                        hasSignatureId: !!message.signatureId,
                    })

                    if (signatureId && signatureStatus === "pending") {
                        const signatureChannelName = `signature-${signatureId}`
                        console.log(
                            "📡 Subscribing to individual signature channel:",
                            signatureChannelName
                        )
                        console.log("🔍 DEBUG: Channel details:", {
                            signatureId: signatureId,
                            channelName: signatureChannelName,
                            messageId: message.id,
                        })

                        const signatureChannel =
                            pusher.subscribe(signatureChannelName)

                        // Listen for signature file upload events
                        signatureChannel.bind(
                            "signature-file-uploaded",
                            (data) => {
                                console.log(
                                    "📝 File uploaded for signature:",
                                    signatureId
                                )
                                console.log(
                                    "🔍 DEBUG: Signature file upload details:",
                                    {
                                        signatureId: signatureId,
                                        channelName: signatureChannelName,
                                        data: data,
                                    }
                                )

                                // Update the specific message with signed status and file
                                setMessages((prevMessages) => {
                                    return prevMessages.map((msg) => {
                                        const msgSignatureId =
                                            msg.signature?.id || msg.signatureId
                                        if (msgSignatureId === signatureId) {
                                            console.log(
                                                "📝 Updating signature status for message:",
                                                msg.id
                                            )
                                            return {
                                                ...msg,
                                                signature: {
                                                    ...msg.signature,
                                                    status: "signed",
                                                    fileUrl:
                                                        data.fileUrl ||
                                                        data.file_url,
                                                },
                                                status: "signed",
                                                fileUrl:
                                                    data.fileUrl ||
                                                    data.file_url,
                                                completedViaPusher: true,
                                            }
                                        }
                                        return msg
                                    })
                                })
                            }
                        )

                        console.log(
                            "✅ Individual signature channel subscribed:",
                            signatureChannelName
                        )
                    }
                })
                console.log(
                    "🔍 DEBUG: Finished checking all messages for pending signatures"
                )
            }

            // Subscribe to channels for current messages
            setMessages((currentMessages) => {
                subscribeToSignatureChannels(currentMessages)
                // Also subscribe to individual signature channels for pending signatures
                subscribeToIndividualSignatureChannels(currentMessages, pusher)
                return currentMessages
            })
        } else {
            console.log("⚠️ No conversations found for signature channel setup")
        }

        // Listen for Pusher connection events
        pusher.connection.bind("connected", () => {
            console.log("🟢 Pusher connected successfully!")
        })

        pusher.connection.bind("disconnected", () => {
            console.log("🔴 Pusher disconnected")
        })

        pusher.connection.bind("error", (error) => {
            console.error("❌ Pusher connection error:", error)
        })

        pusher.connection.bind("state_change", (states) => {
            console.log("🔄 Pusher state changed:", states)
        })

        // Listen for new messages from ALL channels
        Object.keys(channelsRef.current).forEach((conversationId) => {
            const channel = channelsRef.current[conversationId]
            channel.bind("new-message", (data) => {
                console.log("📨 New message received via Pusher:", data)
                console.log("📨 Message details:", {
                    id: data.id,
                    sender: data.sender,
                    content: data.content,
                    fileUrl: data.fileUrl,
                    fileName: data.fileName,
                    fileType: data.fileType,
                    fileSize: data.fileSize,
                    createdAt: data.createdAt,
                    conversationId: conversationId,
                })

                // Get current user ID
                const currentUserId = getCurrentUserId()
                console.log("👤 Current user ID:", currentUserId)
                console.log(
                    "👤 Message sender ID:",
                    data.sender?.id?.toString()
                )

                // Only add to current messages if this is the active conversation
                if (parseInt(conversationId) === activeConversation) {
                    console.log(
                        "✅ Adding Pusher message to active conversation:",
                        {
                            conversationId: conversationId,
                            activeConversation: activeConversation,
                            messageId: data.id,
                            hasFileUrl: !!data.fileUrl,
                            fileType: data.fileType,
                            fileName: data.fileName,
                        }
                    )

                    setMessages((prevMessages) => {
                        console.log(
                            "📝 Current messages count:",
                            prevMessages.length
                        )

                        // Check if message already exists (to avoid duplicates)
                        const messageExists = prevMessages.some(
                            (msg) => msg.id === data.id
                        )
                        console.log("🔍 Message already exists?", messageExists)

                        if (messageExists) {
                            console.log(
                                "📨 Message already exists, skipping duplicate"
                            )
                            return prevMessages
                        }

                        console.log(
                            "➕ Adding new message to current conversation"
                        )
                        const newMessages = [...prevMessages, data]
                        console.log(
                            "📝 New messages count:",
                            newMessages.length
                        )
                        console.log("📝 Last message details:", {
                            id: newMessages[newMessages.length - 1]?.id,
                            hasFileUrl:
                                !!newMessages[newMessages.length - 1]?.fileUrl,
                            fileType:
                                newMessages[newMessages.length - 1]?.fileType,
                            fileName:
                                newMessages[newMessages.length - 1]?.fileName,
                        })
                        return newMessages
                    })
                } else {
                    console.log(
                        "⏸️ Not adding Pusher message - different conversation:",
                        {
                            pusherConversationId: conversationId,
                            activeConversation: activeConversation,
                        }
                    )
                }

                // Always update conversations list with the latest message and sort by newest
                setConversations((prevConversations) => {
                    const updatedConversations = prevConversations.map(
                        (conv) => {
                            if (conv.id === parseInt(conversationId)) {
                                // Update the conversation with the new message
                                const updatedConv = {
                                    ...conv,
                                    messages: [...(conv.messages || []), data],
                                }
                                console.log(
                                    "🔄 Updated conversation:",
                                    conv.id,
                                    "with new message"
                                )
                                return updatedConv
                            }
                            return conv
                        }
                    )

                    // Sort conversations by the latest message timestamp (newest first)
                    const sortedConversations = updatedConversations.sort(
                        (a, b) => {
                            const aLastMessage =
                                a.messages?.[a.messages.length - 1]
                            const bLastMessage =
                                b.messages?.[b.messages.length - 1]

                            if (!aLastMessage && !bLastMessage) return 0
                            if (!aLastMessage) return 1
                            if (!bLastMessage) return -1

                            return (
                                new Date(bLastMessage.createdAt).getTime() -
                                new Date(aLastMessage.createdAt).getTime()
                            )
                        }
                    )

                    console.log("📊 Sorted conversations by latest message")
                    return sortedConversations
                })
            })
        })

        // Listen for other events from ALL channels
        Object.keys(channelsRef.current).forEach((conversationId) => {
            const channel = channelsRef.current[conversationId]

            // Listen for message updates (e.g., read receipts, status changes)
            channel.bind("message-updated", (data) => {
                console.log("📝 Message updated via Pusher:", data)

                // Only update if this is the active conversation
                if (parseInt(conversationId) === activeConversation) {
                    setMessages((prevMessages) => {
                        console.log("🔄 Updating existing message:", data.id)
                        const updatedMessages = prevMessages.map((msg) =>
                            msg.id === data.id ? { ...msg, ...data } : msg
                        )
                        console.log(
                            "📝 Messages after update:",
                            updatedMessages.length
                        )
                        return updatedMessages
                    })
                }
            })

            // Listen for typing indicators
            channel.bind("typing", (data) => {
                console.log("⌨️ Typing indicator received:", data)
            })

            // Listen for user presence
            channel.bind("pusher:member_added", (member) => {
                console.log("👤 User joined conversation:", member)
            })

            channel.bind("pusher:member_removed", (member) => {
                console.log("👋 User left conversation:", member)
            })

            // Listen for subscription success
            channel.bind("pusher:subscription_succeeded", (data) => {
                console.log("✅ Channel subscription succeeded:", data)
            })

            // Listen for subscription errors
            channel.bind("pusher:subscription_error", (error) => {
                console.error("❌ Channel subscription error:", error)
            })
        })

        // Cleanup on conversations change or unmount
        return () => {
            console.log("🧹 Cleaning up Pusher connection for all channels")

            // Clean up conversation channels
            Object.keys(channelsRef.current).forEach((conversationId) => {
                const channelName = `conversation-${conversationId}`
                channelsRef.current[conversationId].unbind_all()
                pusher.unsubscribe(channelName)
                console.log("🧹 Cleaned up conversation channel:", channelName)
            })

            // Clean up user channel
            const currentUserId = getCurrentUserId()
            if (currentUserId) {
                const userChannelName = `user-${currentUserId}`
                try {
                    pusher.unsubscribe(userChannelName)
                    console.log("🧹 Cleaned up user channel:", userChannelName)
                } catch (error) {
                    console.log("⚠️ Error cleaning up user channel:", error)
                }
            }

            pusher.disconnect()
            console.log("✅ Pusher cleanup completed")
        }
    }, [pusherReady, conversations])

    // ── Load messages for active conversation ─────────────────────────────────
    // Messages are now loaded via API when conversation is clicked
    // This useEffect is no longer needed as we fetch messages on demand

    // ── Update contacts order when conversations change ───────────────────────
    useEffect(() => {
        if (conversations && conversations.length > 0) {
            console.log(
                "🔄 Updating contacts order based on conversation sorting"
            )

            // Create contacts list from sorted conversations (same logic as initial load)
            const contactsList = []
            conversations.forEach((conv) => {
                if (conv.type === "group" && conv.project) {
                    contactsList.push({
                        id: `group_${conv.id}`,
                        name: conv.project.name,
                        avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.project.name)}&background=3155a1&color=fff`,
                    })
                } else if (conv.type === "private") {
                    const otherParticipant = conv.participants.find(
                        (p) => p.user.id.toString() !== getCurrentUserId()
                    )
                    if (otherParticipant) {
                        const userName = `${otherParticipant.user.first_name} ${otherParticipant.user.last_name}`
                        contactsList.push({
                            id: otherParticipant.user.id.toString(),
                            name: userName,
                            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=3155a1&color=fff`,
                        })
                    }
                }
            })

            console.log(
                "📊 Updated contacts order:",
                contactsList.map((c) => c.name)
            )
            setContacts(contactsList)
        }
    }, [conversations])

    // ── Search functionality ──────────────────────────────────────────────────
    useEffect(() => {
        if (searchQuery.trim() === "") {
            setFilteredContacts(contacts)
            setIsSearching(false)
        } else {
            setIsSearching(true)
            // Simulate search delay for better UX
            const searchTimeout = setTimeout(() => {
                const filtered = contacts.filter((contact) =>
                    contact.name
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                )
                setFilteredContacts(filtered)
                setIsSearching(false)
            }, 300) // 300ms delay to show loading state

            return () => clearTimeout(searchTimeout)
        }
    }, [searchQuery, contacts])

    // ── Employee search functionality ─────────────────────────────────────────
    useEffect(() => {
        if (employeeSearchQuery.trim() === "") {
            setFilteredEmployees(employees)
        } else {
            const filtered = employees.filter((employee) => {
                const fullName =
                    `${employee.first_name || ""} ${employee.last_name || ""}`.toLowerCase()
                const email = (employee.email || "").toLowerCase()
                const query = employeeSearchQuery.toLowerCase()
                return fullName.includes(query) || email.includes(query)
            })
            setFilteredEmployees(filtered)
        }
    }, [employeeSearchQuery, employees])

    // ── Get Signatures by Conversation ID ---
    const getSignaturesByConversation = async (conversationId) => {
        try {
            console.log(
                "🔍 API Function called with conversationId:",
                conversationId
            )
            console.log(
                "🔍 API URL will be:",
                `${API_URL}/signature/singature/${conversationId}`
            )

            const token = localStorage.getItem("access_token")
            const refreshTokenValue = localStorage.getItem("refresh_token")

            if (!token) {
                throw new Error("No authentication token found")
            }

            console.log(
                "🔍 Making API request to:",
                `${API_URL}/signature/singature/${conversationId}`
            )

            const response = await fetch(
                `${API_URL}/signature/singature/${conversationId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            )

            console.log("🔍 API Response status:", response.status)

            if (!response.ok) {
                if (response.status === 401 && refreshTokenValue) {
                    const refreshResponse =
                        await refreshAccessToken(refreshTokenValue)
                    if (refreshResponse && refreshResponse.access_token) {
                        localStorage.setItem(
                            "access_token",
                            refreshResponse.access_token
                        )
                        if (refreshResponse.refresh_token) {
                            localStorage.setItem(
                                "refresh_token",
                                refreshResponse.refresh_token
                            )
                        }
                        const retryResponse = await fetch(
                            `${API_URL}/signature/singature/${conversationId}`,
                            {
                                method: "GET",
                                headers: {
                                    Authorization: `Bearer ${refreshResponse.access_token}`,
                                    "Content-Type": "application/json",
                                },
                            }
                        )
                        if (!retryResponse.ok) {
                            throw new Error(
                                `Retry failed: ${retryResponse.status} ${retryResponse.statusText}`
                            )
                        }
                        return await retryResponse.json()
                    } else {
                        throw new Error("Failed to refresh token")
                    }
                }
                throw new Error(
                    `API request failed: ${response.status} ${response.statusText}`
                )
            }

            return await response.json()
        } catch (error) {
            console.error("Error fetching signatures:", error)
            throw error
        }
    }

    // ── Header data (Files, Drawings, Signatures) ────────────────────────────
    // Fetch conversation signatures when conversation changes
    useEffect(() => {
        console.log(
            "🔄 useEffect triggered - activeConversation changed to:",
            activeConversation
        )

        const fetchConversationSignatures = async () => {
            if (!activeConversation) {
                console.log("❌ No active conversation, clearing signatures")
                setProjSignatures([])
                setLoadingSignatures(false)
                return
            }

            setLoadingSignatures(true)
            try {
                console.log(
                    "🔍 Fetching signatures for conversation:",
                    activeConversation
                )
                const signatures =
                    await getSignaturesByConversation(activeConversation)
                setProjSignatures(signatures)
                console.log("✅ Signatures fetched:", signatures)
            } catch (error) {
                console.error("❌ Error fetching signatures:", error)
                setProjSignatures([])
            } finally {
                setLoadingSignatures(false)
            }
        }

        fetchConversationSignatures()
    }, [activeConversation])

    // Fetch conversation files when files tab is active
    useEffect(() => {
        const fetchConversationFiles = async () => {
            if (!activeConversation || headerTab !== "files") {
                setProjFiles([])
                return
            }

            setLoadingFiles(true)
            try {
                console.log(
                    "🔄 Fetching conversation files for:",
                    activeConversation
                )

                const filesData =
                    await getFilesForConversation(activeConversation)
                console.log("✅ Conversation files fetched:", filesData)

                if (filesData && Array.isArray(filesData)) {
                    setProjFiles(filesData)
                } else {
                    setProjFiles([])
                }
            } catch (error) {
                console.error("❌ Error fetching conversation files:", error)
                setProjFiles([])
            } finally {
                setLoadingFiles(false)
            }
        }

        fetchConversationFiles()
    }, [activeConversation, headerTab])

    // ── Clear other data when not active ─────────────────────────────────────
    useEffect(() => {
        if (!activeConversation) {
            setProjFiles([])
            setProjDrawings([])
            setProjSignatures([])
            return
        }

        // Clear drawings and signatures data (not implemented yet)
        setProjDrawings([])
        setProjSignatures([])
    }, [activeConversation])

    // ── Messages w/ live subscribe ───────────────────────────────────────────
    // TODO: Implement real-time message updates with API/WebSocket
    // Messages are now loaded from the conversation data in the previous useEffect

    // ── Clear loading state when no conversation is selected ──────────────────
    useEffect(() => {
        if (!activeConversation) {
            setLoadingMessages(false)
            setMessages([])
        }
    }, [activeConversation])

    // ── Auto-scroll ──────────────────────────────────────────────────────────
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // ── Send text / file ─────────────────────────────────────────────────────
    const handleSend = async () => {
        console.log("📤 handleSend called with:", {
            activeConversation,
            hasContent: !!draft.trim(),
            hasAttachment: !!attachment,
            draftLength: draft.trim().length,
        })

        if (!activeConversation || (!draft.trim() && !attachment)) {
            console.log("⏸️ Skipping send - no conversation or content")
            return
        }

        // Create temporary message with loading state
        const tempMessage = {
            id: `temp_${Date.now()}`, // Temporary ID
            sender: {
                id: parseInt(getCurrentUserId()) || 0,
                first_name: "You",
                last_name: "",
                email: "",
                title: null,
                dob: null,
                phone: null,
            },
            content: draft.trim(),
            fileUrl: null,
            fileName: attachment?.name || null,
            fileSize: attachment?.size || null,
            fileType: attachment?.type || null,
            createdAt: new Date().toISOString(),
            status: "sending", // Loading state
        }

        console.log("📝 Created temporary message:", tempMessage)

        // Immediately add the message to the list with loading state
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages, tempMessage]
            console.log(
                "➕ Added temp message to list. Total messages:",
                newMessages.length
            )
            return newMessages
        })

        // Clear the input fields immediately
        const messageContent = draft.trim()
        const messageFile = attachment
        setDraft("")
        setAttachment(null)

        console.log("🧹 Cleared input fields")

        setIsLoading(true)
        try {
            console.log("🚀 Sending message via API:", {
                content: messageContent,
                conversationId: activeConversation,
                hasFile: !!messageFile,
                fileInfo: messageFile
                    ? {
                          name: messageFile.name,
                          size: messageFile.size,
                          type: messageFile.type,
                      }
                    : null,
            })

            // Send message using the API
            const response = await sendMessageToConversation(
                activeConversation,
                messageContent,
                messageFile
            )

            console.log("✅ Message sent successfully. API response:", response)

            // Update the temporary message with success status and real data
            if (response) {
                console.log("🔄 Updating temp message with real data")
                // Replace temp message with real message from server response
                setMessages((prevMessages) => {
                    const updatedMessages = prevMessages.map((msg) =>
                        msg.id === tempMessage.id
                            ? { ...response, status: "sent" } // Use real message data
                            : msg
                    )
                    console.log(
                        "✅ Message updated in list. Total messages:",
                        updatedMessages.length
                    )
                    return updatedMessages
                })
            } else {
                console.warn("⚠️ No response data from API")
            }
        } catch (error) {
            console.error("❌ Failed to send message:", error)

            // Update the message to show error state
            setMessages((prevMessages) => {
                const errorMessages = prevMessages.map((msg) =>
                    msg.id === tempMessage.id
                        ? { ...msg, status: "failed" }
                        : msg
                )
                console.log(
                    "💥 Message marked as failed. Total messages:",
                    errorMessages.length
                )
                return errorMessages
            })
            // You could add a toast notification here to show the error
        } finally {
            setIsLoading(false)
            console.log("🏁 Send operation completed")
        }
    }

    // ── Request signature (two-step) ─────────────────────────────────────────
    const openRequestModal = () => {
        setReqTitle("")
        setReqNotes("")
        setReqDue("")
        setShowRequestModal(true)
    }
    const sendSignatureRequest = async () => {
        if (!activeConversation || !reqTitle.trim()) return

        setIsLoading(true)
        try {
            // --- Get Authentication Token ---
            // Get token from localStorage (matching other APIs)
            const token = localStorage.getItem("access_token")
            const refreshTokenValue = localStorage.getItem("refresh_token")

            if (!token) {
                throw new Error("No authentication token found")
            }

            // --- Prepare API Payload ---
            // Aligned with CreateMessageWithSignatureDto
            const payload = {
                conversationId: parseInt(activeConversation), // Required: Number type
                title: reqTitle.trim() || undefined, // Optional: String type
                notes: reqNotes.trim() || undefined, // Optional: String type
                dueDate: reqDue || undefined, // Optional: ISO date string
            }

            console.log("Creating signature request with payload:", payload)
            console.log("🔍 DEBUG: About to call signature API:", {
                url: `${API_URL}/signature/message-with-signature`,
                payload: payload,
                token: token ? "Present" : "Missing",
            })

            // --- Make API Request ---
            const response = await fetch(
                `${API_URL}/signature/message-with-signature`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            )

            // --- Handle Response ---
            if (!response.ok) {
                // Handle 401 Unauthorized - Token expired
                if (response.status === 401 && refreshTokenValue) {
                    // Try to refresh token (simplified version)
                    console.log("Token expired, attempting refresh...")
                    throw new Error(
                        "Authentication expired. Please login again."
                    )
                }
                throw new Error(
                    `API request failed: ${response.status} ${response.statusText}`
                )
            }

            const result = await response.json()
            console.log("✅ Signature request created successfully:", result)
            console.log("🔍 DEBUG: API Response details:", {
                status: response.status,
                statusText: response.statusText,
                result: result,
                conversationId: activeConversation,
                resultConversationId:
                    result.conversationId || result.conversation_id,
            })

            // Get the conversation ID from the response
            const conversationId =
                result.conversationId ||
                result.conversation_id ||
                activeConversation
            const channelName = `conversation-signature-${conversationId}`
            console.log(
                "🔍 DEBUG: Using conversation ID for channel:",
                conversationId
            )
            console.log("🔍 DEBUG: Expected Pusher channel name:", channelName)

            // --- Success Handling ---
            // Reset form fields
            setReqTitle("")
            setReqNotes("")
            setReqDue("")

            // Close modal
            setShowRequestModal(false)

            // Show success toast message
            console.log("✅ Signature request sent successfully!")
            // Toast notification: "Signature form is requested"
        } catch (error) {
            // --- Error Handling ---
            console.error("Error creating signature request:", error)
            console.error(`Failed to send signature request: ${error.message}`)
            // Toast notification: "Failed to send signature request"
        } finally {
            setIsLoading(false)
        }
    }

    // ── Sign flow (draw / saved) ─────────────────────────────────────────────
    const openSignModal = (m: Message) => {
        setSignForMessage(m)
        setShowSignModal(true)
        setTimeout(() => {
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            if (!canvas || !ctx) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.fillStyle = "#fff"
            ctx.fillRect(0, 0, canvas.width, canvas.height)
            ctx.lineWidth = 2
            ctx.lineCap = "round"
            ctx.strokeStyle = "#111827"
        }, 0)
    }
    const canvasStart = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawingRef.current = true
        const { x, y } = getCanvasPos(e)
        lastPointRef.current = { x, y }
    }
    const canvasMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingRef.current) return
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return
        const { x, y } = getCanvasPos(e)
        const last = lastPointRef.current
        if (!last) return
        ctx.beginPath()
        ctx.moveTo(last.x, last.y)
        ctx.lineTo(x, y)
        ctx.stroke()
        lastPointRef.current = { x, y }
    }
    const canvasEnd = () => {
        isDrawingRef.current = false
        lastPointRef.current = null
    }
    const getCanvasPos = (e: any) => {
        const canvas = canvasRef.current!
        const rect = canvas.getBoundingClientRect()
        const clientX = e.touches ? e.touches[0].clientX : e.clientX
        const clientY = e.touches ? e.touches[0].clientY : e.clientY
        return { x: clientX - rect.left, y: clientY - rect.top }
    }
    const clearSignature = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "#fff"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    const saveSignature = async () => {
        console.log("🎯 saveSignature function called!")
        console.log("signForMessage:", signForMessage)
        console.log("activeConversation:", activeConversation)

        if (!signForMessage || !activeConversation) {
            console.log(
                "❌ Missing required data - signForMessage or activeConversation"
            )
            return
        }

        const canvas = canvasRef.current
        if (!canvas) {
            console.log("❌ Canvas not found")
            return
        }

        console.log("✅ All checks passed, starting signature save...")
        setIsLoading(true)
        try {
            // --- Get Authentication Token ---
            const token = localStorage.getItem("access_token")
            const refreshTokenValue = localStorage.getItem("refresh_token")

            if (!token) {
                throw new Error("No authentication token found")
            }

            // --- Convert Canvas to Image ---
            // Convert the canvas drawing to a data URL (base64 image)
            const signatureDataUrl = canvas.toDataURL("image/png")

            // --- Convert Base64 to Blob for FormData ---
            const response = await fetch(signatureDataUrl)
            const blob = await response.blob()

            // --- Prepare FormData (matching submitSignature.js) ---
            const formData = new FormData()
            formData.append("file", blob, "signature.png")

            const contractId = signForMessage.signature?.id || signForMessage.id

            console.log("Saving signature with contractId:", contractId)

            // --- Make API Request (matching submitSignature.js) ---
            const apiResponse = await fetch(
                `${API_URL}/signature/${contractId}/upload-file`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            )

            // --- Handle Response ---
            if (!apiResponse.ok) {
                if (apiResponse.status === 401 && refreshTokenValue) {
                    console.log("Token expired, attempting refresh...")
                    throw new Error(
                        "Authentication expired. Please login again."
                    )
                }
                throw new Error(
                    `API request failed: ${apiResponse.status} ${apiResponse.statusText}`
                )
            }

            const result = await apiResponse.json()
            console.log("Signature saved successfully:", result)

            // --- Success Handling ---
            // Clear the canvas
            const ctx = canvas.getContext("2d")
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                ctx.fillStyle = "#fff"
                ctx.fillRect(0, 0, canvas.width, canvas.height)
            }

            // Close modal and reset state
            setShowSignModal(false)
            setSignForMessage(null)

            // Show success message
            console.log("✅ Signature submitted successfully!")
            // Toast notification: "Signature submitted successfully"

            // Refresh messages to show updated signature
            if (activeConversation) {
                const messages =
                    await getMessagesByConversationId(activeConversation)
                setMessages(messages)
            }
        } catch (error) {
            console.error("Error saving signature:", error)
            console.error(`Failed to save signature: ${error.message}`)
            // Toast notification: "Failed to save signature"
        } finally {
            setIsLoading(false)
        }
    }
    const signWithSaved = async () => {
        if (!hasSavedSignature || !signForMessage || !activeConversation) return
        setIsLoading(true)
        try {
            // TODO: Implement sign with saved signature API call
            console.log(
                "Using saved signature for message:",
                signForMessage.id,
                "in conversation:",
                activeConversation
            )

            setShowSignModal(false)
            setSignForMessage(null)
        } finally {
            setIsLoading(false)
        }
    }

    // ── Emoji (no deps) ──────────────────────────────────────────────────────
    const addEmoji = (emoji: string) => setDraft((d) => d + emoji)
    const FallbackEmojiPicker = () => {
        const EMOJIS = [
            "😀",
            "😂",
            "😍",
            "👍",
            "🙏",
            "🎉",
            "😢",
            "😎",
            "🤝",
            "📌",
            "✅",
            "⚠️",
            "🚧",
            "🏗️",
            "📎",
            "📅",
        ]
        return (
            <div
                style={{
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 8,
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 28px)",
                    gap: 6,
                }}
            >
                {EMOJIS.map((e) => (
                    <button
                        key={e}
                        onClick={() => {
                            addEmoji(e)
                            setShowEmojiPicker(false)
                        }}
                        style={{
                            fontSize: 18,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                        }}
                    >
                        {e}
                    </button>
                ))}
            </div>
        )
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    const activeContactObj = contacts.find((c) => c.id === selectedContact)
    const currentMsgs = messages
    const activeConversationObj = conversations.find(
        (c) => c.id === activeConversation
    )
    const publicUrl = useCallback(
        (bucket: "chat-files" | "signatures", key: string) => {
            // Return the file URL directly if it's already a complete URL
            if (
                key &&
                (key.startsWith("http://") || key.startsWith("https://"))
            ) {
                return key
            }
            // For now, return a placeholder or handle file URLs differently
            return key || ""
        },
        []
    )
    function parseSignatureRequest(text: string) {
        const lines = text.split("\n").map((l) => l.trim())
        const get = (prefix: string) =>
            lines
                .find((l) =>
                    l.toLowerCase().startsWith(prefix.toLowerCase() + ":")
                )
                ?.split(":")
                .slice(1)
                .join(":")
                .trim() || ""
        const title = get("Title")
        const notes = get("Notes")
        const due = get("Due")
        return { title, notes, due }
    }

    // ── FAB Modal functions ──────────────────────────────────────────────────
    const openFabModal = async () => {
        setShowFabModal(true)
        setEmployeeSearchQuery("")
        setFilteredEmployees([])

        // Fetch employees when modal opens
        setLoadingEmployees(true)
        try {
            const employeesData = await getEmployeesForConversation()
            console.log("📋 Employees data received:", employeesData)

            // Handle different response formats
            let employeesList = []
            if (Array.isArray(employeesData)) {
                employeesList = employeesData
            } else if (
                employeesData &&
                Array.isArray(employeesData.employees)
            ) {
                employeesList = employeesData.employees
            } else if (employeesData && Array.isArray(employeesData.data)) {
                employeesList = employeesData.data
            }

            setEmployees(employeesList)
            setFilteredEmployees(employeesList)
            console.log("✅ Employees set:", employeesList.length)
        } catch (error) {
            console.error("❌ Failed to fetch employees:", error)
            setEmployees([])
            setFilteredEmployees([])
        } finally {
            setLoadingEmployees(false)
        }
    }

    // ── Project Modal functions ──────────────────────────────────────────────
    const openProjectModal = async () => {
        setShowProjectModal(true)

        // Fetch projects when modal opens
        setLoadingProjects(true)
        try {
            const projectsData = await getMyProjects()
            console.log("📋 Projects data received:", projectsData)

            // Handle different response formats
            let projectsList = []
            if (Array.isArray(projectsData)) {
                projectsList = projectsData
            } else if (projectsData && Array.isArray(projectsData.projects)) {
                projectsList = projectsData.projects
            } else if (projectsData && Array.isArray(projectsData.data)) {
                projectsList = projectsData.data
            }

            setProjects(projectsList)
            console.log("✅ Projects set:", projectsList.length)
        } catch (error) {
            console.error("❌ Failed to fetch projects:", error)
            setProjects([])
        } finally {
            setLoadingProjects(false)
        }
    }

    // ── Invite flow (UI + Supabase) ──────────────────────────────────────────
    const openInvite = () => {
        setInviteEmail("")
        setInviteError(null)
        setInviteLink(null)
        setShowInviteModal(true)
    }
    const createInvite = async () => {
        if (!activeConversation) {
            setInviteError("Select a conversation first.")
            return
        }
        if (!inviteEmail.trim() || !/^\S+@\S+\.\S+$/.test(inviteEmail.trim())) {
            setInviteError("Please enter a valid email.")
            return
        }
        setInviteBusy(true)
        setInviteError(null)
        try {
            // TODO: Implement invite API call
            console.log(
                "Creating invite for email:",
                inviteEmail.trim(),
                "conversation:",
                activeConversation
            )
            setInviteError("Invite functionality not yet implemented with API.")
        } catch (e: any) {
            setInviteError(e?.message || "Failed to create invite.")
        } finally {
            setInviteBusy(false)
        }
    }
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch {
            // no-op
        }
    }

    // ── UI ───────────────────────────────────────────────────────────────────
    return (
        <div
            className="cc-root"
            style={{
                display: "flex",
                height: "100vh",
                fontFamily: "'Inter',sans-serif",
                position: "relative",
            }}
        >
            <style>
                {`
          /* Layout breakpoints */
          .cc-root { --sidebar-w: 320px; --sidebar-w-md: 280px; --gutter: 16px; }
          .cc-sidebar { width: var(--sidebar-w); }
          .cc-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

          /* Chat bubble sizing scales slightly across viewports */
          .cc-bubble { max-width: min(70%, 720px); }
          @media (max-width: 1024px) {
            .cc-root { --sidebar-w: var(--sidebar-w-md); }
            .cc-bubble { max-width: min(78%, 640px); }
          }
          @media (max-width: 768px) {
            /* Mobile: sidebar becomes overlay drawer */
            .cc-sidebar {
              position: fixed;
              top: 0; left: 0;
              height: 100dvh;
              transform: translateX(-100%);
              transition: transform .25s ease;
              z-index: 140;
              width: min(86vw, 360px);
              background: #fff;
            }
            .cc-sidebar.open { transform: translateX(0); }
            .cc-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,.35);
              z-index: 139;
            }
            .cc-bubble { max-width: 88%; }
          }

          /* Header horizontal cards rail */
          .cc-cards-rail { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
          .cc-cards-rail::-webkit-scrollbar { height: 6px; }
          .cc-cards-rail::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 999px; }

          /* Sticky composer on mobile for safe thumbs */
          @media (max-width: 768px) {
            .cc-composer { position: sticky; bottom: 0; }
          }

          /* Loading spinner animation */
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
            </style>

            {/* Version tag */}
            <div
                style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    fontSize: 10,
                    color: "#9CA3AF",
                    pointerEvents: "none",
                }}
            >
                {BUILD_TAG}
            </div>

            {/* MOBILE overlay when sidebar is open */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        className="cc-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Left pane (responsive: static on desktop, drawer on mobile) */}
            <div
                className={`cc-sidebar ${sidebarOpen ? "open" : ""}`}
                style={{
                    borderRight: "1px solid #ddd",
                    display: "flex",
                    flexDirection: "column",
                    background: "#fff",
                }}
            >
                {/* Conversation selector + Invite - COMMENTED OUT */}
                {/* <div style={{ padding: 16, borderBottom: "1px solid #eee" }}>
                    <div
                        style={{
                            fontWeight: 600,
                            fontSize: 16,
                            marginBottom: 8,
                        }}
                    >
                        Conversations
                    </div>
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                        }}
                    >
                        <div style={{ position: "relative", flex: 1 }}>
                            {loadingConversations ? (
                                <div
                style={{
                    width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 12,
                                        border: "1px solid #ddd",
                                        background: "#f5f5f5",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                                        fontSize: 14,
                                        color: "#666",
                }}
            >
                        <div
                            style={{
                                width: 16,
                                height: 16,
                                            border: "2px solid #ddd",
                                borderTop: "2px solid #3155a1",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                            }}
                        />
                                    Loading conversations...
                                </div>
                            ) : (
                            <select
                                    value={activeConversation ?? ""}
                                onChange={(e) =>
                                        setActiveConversation(Number(e.target.value))
                                }
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: 12,
                                    border: "1px solid #ddd",
                                    outline: "none",
                                    fontSize: 14,
                                    appearance: "none",
                                    background: "#fff",
                                }}
                            >
                                    {conversations.length === 0 ? (
                                        <option value="">No conversations found</option>
                                    ) : (
                                        conversations.map((conv) => (
                                            <option key={conv.id} value={conv.id}>
                                                {conv.type === "group" && conv.project 
                                                    ? `${conv.project.name} (Group)`
                                                    : conv.type === "private" 
                                                        ? `Private Chat`
                                                        : `Conversation ${conv.id}`
                                                }
                                    </option>
                                        ))
                                    )}
                            </select>
                            )}
                            {!loadingConversations && (
                            <ChevronDown
                                size={16}
                        style={{
                            position: "absolute",
                                    right: 10,
                                    top: 12,
                                    color: "#888",
                                }}
                            />
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setSidebarOpen(false)
                                openInvite()
                            }}
                            style={{
                                whiteSpace: "nowrap",
                                padding: "10px 12px",
                                borderRadius: 999,
                                border: "1px solid #e5e7eb",
                                background: "#fff",
                                color: "#111827",
                                cursor: "pointer",
                                fontSize: 13,
                            }}
                            title="Invite a company/person to this project"
                        >
                            Invite
                        </button>
                    </div>
                </div> */}

                <div style={{ padding: 16, fontWeight: 600, fontSize: 18 }}>
                    Conversations
                </div>

                <div style={{ padding: "0 16px 16px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            background: "#f0f0f0",
                            borderRadius: 12,
                            padding: "8px 12px",
                        }}
                    >
                        <Search size={16} color="#888" />
                        <input
                            placeholder="Search conversations…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                border: "none",
                                background: "transparent",
                                marginLeft: 8,
                                flex: 1,
                                outline: "none",
                                fontSize: 14,
                                color: "#555",
                            }}
                        />
                        <button
                            onClick={openFabModal}
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                padding: 4,
                                marginLeft: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                            title="Quick Actions"
                        >
                            <Plus size={18} color="#888" />
                        </button>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto" }}>
                    {loadingConversations ? (
                        <div
                            style={{
                                padding: 16,
                                color: "#777",
                                fontSize: 14,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    border: "2px solid #ddd",
                                    borderTop: "2px solid #3155a1",
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                            Loading conversations...
                        </div>
                    ) : isSearching ? (
                        <div
                            style={{
                                padding: 16,
                                color: "#777",
                                fontSize: 14,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                justifyContent: "center",
                            }}
                        >
                            <div
                                style={{
                                    width: 16,
                                    height: 16,
                                    border: "2px solid #ddd",
                                    borderTop: "2px solid #3155a1",
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                }}
                            />
                            Searching conversations...
                        </div>
                    ) : filteredContacts.length === 0 ? (
                        <div
                            style={{ padding: 16, color: "#777", fontSize: 14 }}
                        >
                            {searchQuery.trim()
                                ? "No conversations found matching your search."
                                : "No conversations found."}
                        </div>
                    ) : (
                        filteredContacts.map((c) => {
                            const isActive = c.id === selectedContact

                            // Find the conversation for this contact
                            let conversation = null
                            if (c.id.startsWith("group_")) {
                                const conversationId = parseInt(
                                    c.id.replace("group_", "")
                                )
                                conversation = conversations.find(
                                    (conv) => conv.id === conversationId
                                )
                            } else {
                                conversation = conversations.find(
                                    (conv) =>
                                        conv.type === "private" &&
                                        conv.participants.some(
                                            (p) => p.user.id.toString() === c.id
                                        )
                                )
                            }

                            // Get the last message for this conversation
                            const lastMessage =
                                conversation?.messages?.[
                                    conversation.messages.length - 1
                                ]

                            return (
                                <motion.div
                                    key={c.id}
                                    onClick={async () => {
                                        console.log("🎯 Contact clicked:", {
                                            contactId: c.id,
                                            contactName: c.name,
                                            isGroup: c.id.startsWith("group_"),
                                        })

                                        setSelectedContact(c.id)
                                        setSidebarOpen(false) // close drawer on mobile after selection

                                        // Find and set the corresponding conversation
                                        let conversationId = null
                                        if (c.id.startsWith("group_")) {
                                            // Group contact - find conversation by ID
                                            conversationId = parseInt(
                                                c.id.replace("group_", "")
                                            )
                                            console.log(
                                                "📁 Group conversation selected:",
                                                conversationId
                                            )
                                            setActiveConversation(
                                                conversationId
                                            )
                                        } else {
                                            // Private contact - find conversation with this user
                                            const conversation =
                                                conversations.find(
                                                    (conv) =>
                                                        conv.type ===
                                                            "private" &&
                                                        conv.participants.some(
                                                            (p) =>
                                                                p.user.id.toString() ===
                                                                c.id
                                                        )
                                                )
                                            if (conversation) {
                                                conversationId = conversation.id
                                                console.log(
                                                    "👤 Private conversation selected:",
                                                    conversationId
                                                )
                                                setActiveConversation(
                                                    conversation.id
                                                )
                                            } else {
                                                console.warn(
                                                    "⚠️ No conversation found for contact:",
                                                    c.id
                                                )
                                            }
                                        }

                                        // Fetch messages for the selected conversation
                                        if (conversationId) {
                                            console.log(
                                                "📡 Fetching messages for conversation:",
                                                conversationId
                                            )
                                            // Set loading state immediately when starting to fetch messages
                                            setLoadingMessages(true)
                                            setMessages([]) // Clear previous messages while loading new ones
                                            try {
                                                const messagesData =
                                                    await getMessagesByConversationId(
                                                        conversationId
                                                    )

                                                console.log(
                                                    "=== API Response for Messages ==="
                                                )
                                                console.log(
                                                    "Raw API Response:",
                                                    messagesData
                                                )
                                                console.log(
                                                    "Response Type:",
                                                    typeof messagesData
                                                )
                                                console.log(
                                                    "Is Array:",
                                                    Array.isArray(messagesData)
                                                )

                                                if (
                                                    Array.isArray(messagesData)
                                                ) {
                                                    console.log(
                                                        "Number of messages:",
                                                        messagesData.length
                                                    )
                                                    if (
                                                        messagesData.length > 0
                                                    ) {
                                                        console.log(
                                                            "First message structure:",
                                                            messagesData[0]
                                                        )
                                                        console.log(
                                                            "Message keys:",
                                                            Object.keys(
                                                                messagesData[0]
                                                            )
                                                        )
                                                    }
                                                }
                                                console.log(
                                                    "================================"
                                                )

                                                // Sort messages by created_at timestamp (oldest first)
                                                const sortedMessages = (
                                                    messagesData || []
                                                ).sort(
                                                    (a, b) =>
                                                        new Date(
                                                            a.createdAt
                                                        ).getTime() -
                                                        new Date(
                                                            b.createdAt
                                                        ).getTime()
                                                )

                                                console.log(
                                                    "📝 Setting messages:",
                                                    sortedMessages.length
                                                )
                                                console.log(
                                                    "📝 Message details:",
                                                    sortedMessages.map(
                                                        (msg) => ({
                                                            id: msg.id,
                                                            hasFileUrl:
                                                                !!msg.fileUrl,
                                                            fileType:
                                                                msg.fileType,
                                                            fileName:
                                                                msg.fileName,
                                                            content:
                                                                msg.content,
                                                        })
                                                    )
                                                )
                                                setMessages(sortedMessages)

                                                // --- Subscribe to Signature Channels for Initial Load ---
                                                const pendingSignatures =
                                                    sortedMessages.filter(
                                                        (msg) => {
                                                            const signatureId =
                                                                msg.signature
                                                                    ?.id ||
                                                                msg.signatureId
                                                            const signatureStatus =
                                                                msg.signature
                                                                    ?.status ||
                                                                msg.status
                                                            return (
                                                                signatureId &&
                                                                signatureStatus ===
                                                                    "pending"
                                                            )
                                                        }
                                                    )

                                                if (
                                                    pendingSignatures.length > 0
                                                ) {
                                                    console.log(
                                                        "📋 Found pending signatures:",
                                                        pendingSignatures.length
                                                    )
                                                    console.log(
                                                        "📋 Signatures to subscribe:",
                                                        pendingSignatures
                                                            .map((msg) => {
                                                                const signatureId =
                                                                    msg
                                                                        .signature
                                                                        ?.id ||
                                                                    msg.signatureId
                                                                return `signature-${signatureId}`
                                                            })
                                                            .join(", ")
                                                    )
                                                    window.pendingSignaturesForSubscription =
                                                        pendingSignatures

                                                    const subscribeToPendingSignatures =
                                                        (pusherInstance) => {
                                                            if (!pusherInstance)
                                                                return

                                                            pendingSignatures.forEach(
                                                                (msg) => {
                                                                    const signatureId =
                                                                        msg
                                                                            .signature
                                                                            ?.id ||
                                                                        msg.signatureId
                                                                    const signatureChannelName = `signature-${signatureId}`

                                                                    console.log(
                                                                        "📡 Subscribing to:",
                                                                        signatureChannelName
                                                                    )

                                                                    try {
                                                                        const signatureChannel =
                                                                            pusherInstance.subscribe(
                                                                                signatureChannelName
                                                                            )

                                                                        signatureChannel.bind(
                                                                            "signature-file-uploaded",
                                                                            (
                                                                                data
                                                                            ) => {
                                                                                console.log(
                                                                                    "📝 File uploaded for signature:",
                                                                                    signatureId
                                                                                )
                                                                                setMessages(
                                                                                    (
                                                                                        prevMessages
                                                                                    ) => {
                                                                                        return prevMessages.map(
                                                                                            (
                                                                                                prevMsg
                                                                                            ) => {
                                                                                                const msgSignatureId =
                                                                                                    prevMsg
                                                                                                        .signature
                                                                                                        ?.id ||
                                                                                                    prevMsg.signatureId
                                                                                                if (
                                                                                                    msgSignatureId ===
                                                                                                    signatureId
                                                                                                ) {
                                                                                                    return {
                                                                                                        ...prevMsg,
                                                                                                        signature:
                                                                                                            {
                                                                                                                ...prevMsg.signature,
                                                                                                                status: "signed",
                                                                                                                fileUrl:
                                                                                                                    data.fileUrl ||
                                                                                                                    data.file_url,
                                                                                                            },
                                                                                                        status: "signed",
                                                                                                        fileUrl:
                                                                                                            data.fileUrl ||
                                                                                                            data.file_url,
                                                                                                        completedViaPusher:
                                                                                                            true,
                                                                                                    }
                                                                                                }
                                                                                                return prevMsg
                                                                                            }
                                                                                        )
                                                                                    }
                                                                                )
                                                                            }
                                                                        )
                                                                    } catch (error) {
                                                                        console.error(
                                                                            "❌ Error subscribing to signature channel:",
                                                                            error
                                                                        )
                                                                    }
                                                                }
                                                            )

                                                            window.pendingSignaturesForSubscription =
                                                                null
                                                        }

                                                    subscribeToPendingSignatures(
                                                        window.pusherInstance
                                                    )
                                                }
                                            } catch (error) {
                                                console.error(
                                                    "❌ Failed to fetch messages:",
                                                    error
                                                )
                                                setMessages([])
                                            } finally {
                                                setLoadingMessages(false)
                                            }
                                        } else {
                                            console.log(
                                                "⏸️ No conversation ID, skipping message fetch"
                                            )
                                        }
                                    }}
                                    style={{
                                        padding: "12px 16px",
                                        background: isActive
                                            ? "#eef5ff"
                                            : "transparent",
                                        cursor: "pointer",
                                        borderBottom: "1px solid #f0f0f0",
                                    }}
                                    whileHover={{ background: "#f7f7f7" }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <img
                                            src={c.avatar_url}
                                            alt={c.name}
                                            style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: "50%",
                                                objectFit: "cover",
                                                flexShrink: 0,
                                            }}
                                        />
                                        <div
                                            style={{
                                                marginLeft: 12,
                                                flex: 1,
                                                overflow: "hidden",
                                                minWidth: 0,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    fontWeight: 500,
                                                    fontSize: 14,
                                                    marginBottom: 4,
                                                    color: "#333",
                                                }}
                                            >
                                                {c.name}
                                            </div>

                                            {lastMessage ? (
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#666",
                                                        lineHeight: 1.3,
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {(() => {
                                                        // Check if the last message has a file attachment
                                                        if (
                                                            lastMessage.fileUrl
                                                        ) {
                                                            const fileType =
                                                                lastMessage.fileType ||
                                                                lastMessage.file_type
                                                            const hasImage =
                                                                fileType &&
                                                                fileType.startsWith(
                                                                    "image/"
                                                                )
                                                            const hasDocument =
                                                                fileType &&
                                                                !hasImage

                                                            console.log(
                                                                "🖼️ Sidebar message preview:",
                                                                {
                                                                    hasFileUrl:
                                                                        !!lastMessage.fileUrl,
                                                                    fileType:
                                                                        fileType,
                                                                    fileName:
                                                                        lastMessage.fileName,
                                                                    hasImage:
                                                                        hasImage,
                                                                    hasDocument:
                                                                        hasDocument,
                                                                }
                                                            )

                                                            if (hasImage) {
                                                                return (
                                                                    <span
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: 4,
                                                                        }}
                                                                    >
                                                                        📷{" "}
                                                                        {lastMessage.fileName ||
                                                                            "Image"}
                                                                    </span>
                                                                )
                                                            } else if (
                                                                hasDocument
                                                            ) {
                                                                return (
                                                                    <span
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: 4,
                                                                        }}
                                                                    >
                                                                        📁{" "}
                                                                        {lastMessage.fileName ||
                                                                            "Document"}
                                                                    </span>
                                                                )
                                                            } else {
                                                                return (
                                                                    <span
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: 4,
                                                                        }}
                                                                    >
                                                                        📎{" "}
                                                                        {lastMessage.fileName ||
                                                                            "File"}
                                                                    </span>
                                                                )
                                                            }
                                                        }

                                                        // Check if the last message is a signature request
                                                        if (
                                                            lastMessage.signature ||
                                                            (lastMessage.signatureId &&
                                                                lastMessage.status)
                                                        ) {
                                                            return "📁 ✏️"
                                                        }

                                                        // Show regular text content
                                                        return (
                                                            lastMessage.content ||
                                                            "Message"
                                                        )
                                                    })()}
                                                </div>
                                            ) : (
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#999",
                                                        fontStyle: "italic",
                                                    }}
                                                >
                                                    No messages in this
                                                    conversation
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Right pane */}
            <div className="cc-main">
                {/* Header */}
                <div style={{ borderBottom: "1px solid #ddd" }}>
                    <div
                        style={{
                            padding: 12,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                        }}
                    >
                        {/* Mobile: menu button */}
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                            }}
                        >
                            <button
                                onClick={() => setSidebarOpen((s) => !s)}
                                aria-label="Toggle contacts"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 36,
                                    height: 36,
                                    borderRadius: 10,
                                    border: "1px solid #e5e7eb",
                                    background: "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                <Menu size={18} />
                            </button>

                            {activeContactObj && (
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        minWidth: 0,
                                    }}
                                >
                                    <img
                                        src={activeContactObj.avatar_url}
                                        alt={activeContactObj.name}
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: "50%",
                                            objectFit: "cover",
                                        }}
                                    />
                                    <div
                                        style={{ marginLeft: 10, minWidth: 0 }}
                                    >
                                        <div
                                            style={{
                                                fontWeight: 600,
                                                lineHeight: 1.15,
                                                whiteSpace: "nowrap",
                                                textOverflow: "ellipsis",
                                                overflow: "hidden",
                                                maxWidth: "48vw",
                                            }}
                                        >
                                            {activeContactObj.name}
                                        </div>
                                        <div
                                            style={{
                                                fontSize: 12,
                                                color: "#4CAF50",
                                            }}
                                        >
                                            ● Online
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <MoreHorizontal
                            size={20}
                            style={{ cursor: "pointer" }}
                        />
                    </div>

                    {/* Cards bar */}
                    <div
                        style={{
                            padding: "8px 12px",
                            borderTop: "1px solid #eee",
                            background: "#fafafa",
                        }}
                    >
                        <div className="cc-cards-rail">
                            {[
                                {
                                    key: "files",
                                    label: "Files",
                                    icon: <FileText size={16} />,
                                },
                                {
                                    key: "drawings",
                                    label: "Drawings",
                                    icon: <ImageIcon size={16} />,
                                },
                                {
                                    key: "signatures",
                                    label: "e-Signatures",
                                    icon: <PenTool size={16} />,
                                },
                            ].map((t: any) => {
                                const active = headerTab === t.key
                                return (
                                    <button
                                        key={t.key}
                                        onClick={async () => {
                                            if (
                                                t.key === "signatures" &&
                                                activeConversation
                                            ) {
                                                setLoadingSignatures(true)
                                                try {
                                                    console.log(
                                                        "🔍 Manual fetch - Fetching signatures for conversation:",
                                                        activeConversation
                                                    )
                                                    const signatures =
                                                        await getSignaturesByConversation(
                                                            activeConversation
                                                        )
                                                    setProjSignatures(
                                                        signatures
                                                    )
                                                    console.log(
                                                        "✅ Manual fetch - Signatures fetched:",
                                                        signatures
                                                    )
                                                } catch (error) {
                                                    console.error(
                                                        "❌ Manual fetch - Error fetching signatures:",
                                                        error
                                                    )
                                                    setProjSignatures([])
                                                } finally {
                                                    setLoadingSignatures(false)
                                                }
                                            }
                                            setHeaderTab(t.key)
                                        }}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 6,
                                            padding: "8px 12px",
                                            borderRadius: 999,
                                            border: `1px solid ${active ? ACCENT : "#e5e7eb"}`,
                                            background: active
                                                ? "#eef5ff"
                                                : "#fff",
                                            color: active ? ACCENT : "#111827",
                                            cursor: "pointer",
                                            whiteSpace: "nowrap",
                                            flex: "0 0 auto",
                                        }}
                                    >
                                        {t.icon}
                                        {t.label}
                                        {t.key === "signatures" &&
                                            projSignatures.length > 0 && (
                                                <span
                                                    style={{
                                                        marginLeft: 6,
                                                        background: ACCENT,
                                                        color: "#fff",
                                                        borderRadius: 999,
                                                        padding: "0 6px",
                                                        fontSize: 12,
                                                        lineHeight: "18px",
                                                        height: 18,
                                                    }}
                                                >
                                                    {projSignatures.length}
                                                </span>
                                            )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Card content */}
                        <div
                            style={{
                                display: "flex",
                                gap: 10,
                                padding: "10px 2px",
                                overflowX: "auto",
                            }}
                        >
                            {headerTab === "files" &&
                                (loadingFiles ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            color: "#6b7280",
                                            fontSize: 14,
                                            padding: 6,
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 16,
                                                height: 16,
                                                border: "2px solid #ddd",
                                                borderTop: "2px solid #3155a1",
                                                borderRadius: "50%",
                                                animation:
                                                    "spin 1s linear infinite",
                                            }}
                                        />
                                        Loading files...
                                    </div>
                                ) : projFiles.length ? (
                                    projFiles.map((f) => (
                                        <div
                                            key={f.id}
                                            onClick={() => {
                                                console.log(
                                                    "📁 File clicked:",
                                                    f.fileName,
                                                    "URL:",
                                                    f.fileUrl
                                                )
                                                // Open file in new tab
                                                if (f.fileUrl) {
                                                    window.open(
                                                        f.fileUrl,
                                                        "_blank"
                                                    )
                                                }
                                            }}
                                            style={{
                                                minWidth: 180,
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                padding: 10,
                                                background: "#fff",
                                                cursor: "pointer",
                                                color: "#111827",
                                                flex: "0 0 auto",
                                                transition: "all 0.2s ease",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.borderColor =
                                                    "#3155a1"
                                                e.target.style.background =
                                                    "#f8f9ff"
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.borderColor =
                                                    "#e5e7eb"
                                                e.target.style.background =
                                                    "#fff"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                {isImageFile(f.fileName) ? (
                                                    <img
                                                        src={f.fileUrl}
                                                        alt={f.fileName}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            objectFit: "cover",
                                                            borderRadius: 6,
                                                            border: "1px solid #e5e7eb",
                                                        }}
                                                        onError={(e) => {
                                                            // Fallback to icon if image fails to load
                                                            e.target.style.display =
                                                                "none"
                                                            e.target.nextSibling.style.display =
                                                                "inline"
                                                        }}
                                                    />
                                                ) : null}
                                                <span
                                                    style={{
                                                        fontSize: 16,
                                                        display: isImageFile(
                                                            f.fileName
                                                        )
                                                            ? "none"
                                                            : "inline",
                                                    }}
                                                >
                                                    {getFileIcon(f.fileName)}
                                                </span>
                                                <strong
                                                    style={{
                                                        fontSize: 14,
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {f.fileName}
                                                </strong>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "#6b7280",
                                                    marginTop: 6,
                                                }}
                                            >
                                                {f.fileSize
                                                    ? `${(f.fileSize * 1024).toFixed(1)} KB`
                                                    : "Unknown size"}{" "}
                                                •{" "}
                                                {new Date(
                                                    f.uploadedAt
                                                ).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        style={{
                                            color: "#6b7280",
                                            fontSize: 14,
                                            padding: 6,
                                        }}
                                    >
                                        No files found for this conversation
                                    </div>
                                ))}

                            {headerTab === "drawings" &&
                                (projDrawings.length ? (
                                    projDrawings.map((d) => (
                                        <a
                                            key={d.id}
                                            href={d.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                minWidth: 180,
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                padding: 10,
                                                background: "#fff",
                                                textDecoration: "none",
                                                color: "#111827",
                                                flex: "0 0 auto",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                <ImageIcon size={16} />
                                                <strong
                                                    style={{
                                                        fontSize: 14,
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {d.name}
                                                </strong>
                                            </div>
                                            <div
                                                style={{
                                                    fontSize: 11,
                                                    color: "#6b7280",
                                                    marginTop: 6,
                                                }}
                                            >
                                                {new Date(
                                                    d.created_at
                                                ).toLocaleDateString()}
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div
                                        style={{
                                            color: "#6b7280",
                                            fontSize: 14,
                                            padding: 6,
                                        }}
                                    >
                                        No drawings
                                    </div>
                                ))}

                            {headerTab === "signatures" &&
                                (loadingSignatures ? (
                                    <div
                                        style={{
                                            color: "#6b7280",
                                            fontSize: 14,
                                            padding: 20,
                                            textAlign: "center",
                                        }}
                                    >
                                        Loading signatures...
                                    </div>
                                ) : projSignatures.length ? (
                                    projSignatures.map((s) => (
                                        <div
                                            key={s.id}
                                            style={{
                                                minWidth: 220,
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                padding: 10,
                                                background: "#fff",
                                                color: "#111827",
                                                flex: "0 0 auto",
                                                cursor: "pointer",
                                            }}
                                            onClick={() => {
                                                // Create signature details HTML with same card design
                                                const signatureDetails = `
                                                    <html>
                                                        <head>
                                                            <title>Signature Details - ${s.title || "Contract for Signature"}</title>
                                                            <style>
                                                                body { 
                                                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                                                    margin: 0;
                                                                    padding: 20px;
                                                                    background: #f8f9fa;
                                                                }
                                                                .container {
                                                                    max-width: 500px;
                                                                    margin: 0 auto;
                                                                    display: flex;
                                                                    flex-direction: column;
                                                                    gap: 16px;
                                                                }
                                                                .card {
                                                                    background-color: #f8f9fa;
                                                                    border-radius: 12px;
                                                                    padding: 16px;
                                                                    border: 1px solid #e5e7eb;
                                                                }
                                                                .header-card {
                                                                    background-color: #f8f9fa;
                                                                    border-radius: 12px;
                                                                    padding: 16px;
                                                                    border: 1px solid #e5e7eb;
                                                                }
                                                                .contract-header {
                                                                    display: flex;
                                                                    align-items: center;
                                                                    margin-bottom: 16px;
                                                                }
                                                                .icon-container {
                                                                    width: 48px;
                                                                    height: 48px;
                                                                    border-radius: 50%;
                                                                    background-color: black;
                                                                    display: flex;
                                                                    align-items: center;
                                                                    justify-content: center;
                                                                    margin-right: 16px;
                                                                }
                                                                .title-section {
                                                                    flex: 1;
                                                                }
                                                                .contract-title {
                                                                    font-size: 14px;
                                                                    font-weight: bold;
                                                                    color: #333;
                                                                    margin: 0;
                                                                }
                                                                .status-badge {
                                                                    padding: 4px 8px;
                                                                    border-radius: 12px;
                                                                    font-size: 10px;
                                                                    font-weight: 500;
                                                                    margin-top: 4px;
                                                                    display: inline-block;
                                                                }
                                                                .status-signed {
                                                                    background-color: #dcfce7;
                                                                    color: #166534;
                                                                }
                                                                .status-pending {
                                                                    background-color: #fef3c7;
                                                                    color: #92400e;
                                                                }
                                                                .status-unknown {
                                                                    background-color: #f3f4f6;
                                                                    color: #374151;
                                                                }
                                                                .field-label {
                                                                    font-size: 12px;
                                                                    font-weight: 600;
                                                                    color: #333;
                                                                    margin-bottom: 8px;
                                                                }
                                                                .field-value {
                                                                    font-size: 11px;
                                                                    color: #333;
                                                                    background-color: #f8f9fa;
                                                                    padding: 12px;
                                                                    border-radius: 8px;
                                                                    margin: 0;
                                                                }
                                                                .field-value-gray {
                                                                    font-size: 11px;
                                                                    color: #666;
                                                                    background-color: #f8f9fa;
                                                                    padding: 12px;
                                                                    border-radius: 8px;
                                                                    margin: 0;
                                                                }
                                                                .image-container {
                                                                    background-color: #f8f9fa;
                                                                    padding: 12px;
                                                                    border-radius: 8px;
                                                                }
                                                                .signature-image {
                                                                    width: 100%;
                                                                    height: 128px;
                                                                    object-fit: contain;
                                                                    border-radius: 8px;
                                                                }
                                                                .image-caption {
                                                                    font-size: 10px;
                                                                    color: #666;
                                                                    margin-top: 8px;
                                                                    text-align: center;
                                                                }
                                                            </style>
                                                        </head>
                                                        <body>
                                                            <div class="container">
                                                                <!-- Header Card -->
                                                                <div class="header-card">
                                                                    <!-- Contract Header -->
                                                                    <div class="contract-header">
                                                                        <div class="icon-container">
                                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                                                                <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z"/>
                                                                            </svg>
                                                                        </div>
                                                                        <div class="title-section">
                                                                            <div class="contract-title">Contract for Signature</div>
                                                                            <div class="status-badge ${s.status === 'signed' ? 'status-signed' : s.status === 'pending' ? 'status-pending' : 'status-unknown'}">
                                                                                ${s.status?.toUpperCase() || 'UNKNOWN'}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <!-- Contract Title -->
                                                                    <div>
                                                                        <div class="field-label">Document Title</div>
                                                                        <div class="field-value">${s.title || "Contract for Signature"}</div>
                                                                    </div>
                                                                </div>

                                                                ${s.notes ? `
                                                                <!-- Instructions Card -->
                                                                <div class="card">
                                                                    <div class="field-label">Instructions</div>
                                                                    <div class="field-value-gray">${s.notes}</div>
                                                                </div>
                                                                ` : ''}

                                                                ${s.requestedBy ? `
                                                                <!-- Requested By Card -->
                                                                <div class="card">
                                                                    <div class="field-label">Requested By</div>
                                                                    <div class="field-value-gray">${s.requestedBy?.name || s.requestedBy}${s.requestedBy?.email ? ` (${s.requestedBy.email})` : ''}</div>
                                                                </div>
                                                                ` : ''}

                                                                ${s.signatureFrom ? `
                                                                <!-- Signature From Card -->
                                                                <div class="card">
                                                                    <div class="field-label">Signature From</div>
                                                                    <div class="field-value-gray">${s.signatureFrom?.name || s.signatureFrom}${s.signatureFrom?.email ? ` (${s.signatureFrom.email})` : ''}</div>
                                                                </div>
                                                                ` : ''}

                                                                ${s.dueDate ? `
                                                                <!-- Due Date Card -->
                                                                <div class="card">
                                                                    <div class="field-label">Due Date</div>
                                                                    <div class="field-value-gray">${new Date(s.dueDate).toLocaleDateString()}</div>
                                                                </div>
                                                                ` : ''}

                                                                ${s.createdAt ? `
                                                                <!-- Created Date Card -->
                                                                <div class="card">
                                                                    <div class="field-label">Created</div>
                                                                    <div class="field-value-gray">${new Date(s.createdAt).toLocaleDateString()}</div>
                                                                </div>
                                                                ` : ''}

                                                                ${s.fileUrl ? `
                                                                <!-- Document Preview Card -->
                                                                <div class="card">
                                                                    <div class="field-label">Document</div>
                                                                    ${(() => {
                                                                        const fileUrl = s.fileUrl;
                                                                        const isImage = fileUrl && (
                                                                            fileUrl.toLowerCase().includes('.jpg') ||
                                                                            fileUrl.toLowerCase().includes('.jpeg') ||
                                                                            fileUrl.toLowerCase().includes('.png') ||
                                                                            fileUrl.toLowerCase().includes('.gif') ||
                                                                            fileUrl.toLowerCase().includes('.webp')
                                                                        );
                                                                        
                                                                        if (isImage) {
                                                                            return `
                                                                                <div class="image-container">
                                                                                    <img src="${fileUrl}" alt="Signature" class="signature-image" />
                                                                                    <div class="image-caption">
                                                                                        ${s.fileName || 'Image'}${s.fileSize ? ` • ${(s.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                                                                                    </div>
                                                                                </div>
                                                                            `;
                                                                        } else {
                                                                            return `
                                                                                <div class="field-value-gray">
                                                                                    ${s.fileUrl}${s.fileSize ? ` • ${(s.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                                                                                </div>
                                                                            `;
                                                                        }
                                                                    })()}
                                                                </div>
                                                                ` : ''}
                                                            </div>
                                                        </body>
                                                    </html>
                                                `
                                                
                                                // Open in new tab
                                                const newWindow = window.open('', '_blank', 'width=600,height=800,scrollbars=yes,resizable=yes')
                                                newWindow.document.write(signatureDetails)
                                                newWindow.document.close()
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                }}
                                            >
                                                <PenTool
                                                    size={16}
                                                    color={
                                                        s.status === "signed"
                                                            ? "#22c55e"
                                                            : "#f59e0b"
                                                    }
                                                />
                                                <strong
                                                    style={{
                                                        fontSize: 14,
                                                        overflow: "hidden",
                                                        textOverflow:
                                                            "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {s.title ||
                                                        "Contract for Signature"}
                                                </strong>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        style={{
                                            color: "#6b7280",
                                            fontSize: 14,
                                            padding: 6,
                                        }}
                                    >
                                        No signatures yet
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div
                    style={{
                        flex: 1,
                        padding: 12,
                        overflowY: "auto",
                        background: "#fcfcfc",
                    }}
                >
                    {!activeConversation ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                color: "#666",
                                fontSize: 16,
                                textAlign: "center",
                            }}
                        >
                            <div>
                                <div style={{ marginBottom: 8, fontSize: 24 }}>
                                    💬
                                </div>
                                <div>
                                    Select a conversation to see the chats
                                </div>
                            </div>
                        </div>
                    ) : loadingMessages ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                color: "#666",
                                fontSize: 16,
                                textAlign: "center",
                            }}
                        >
                            <div>
                                <div style={{ marginBottom: 8, fontSize: 24 }}>
                                    ⏳
                                </div>
                                <div>Loading chats...</div>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                height: "100%",
                                color: "#666",
                                fontSize: 16,
                                textAlign: "center",
                            }}
                        >
                            <div>
                                <div style={{ marginBottom: 8, fontSize: 24 }}>
                                    📝
                                </div>
                                <div>No messages in this conversation</div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        marginTop: 4,
                                        opacity: 0.7,
                                    }}
                                >
                                    Start the conversation below
                                </div>
                            </div>
                        </div>
                    ) : (
                        currentMsgs.map((m) => {
                            const currentUserId = getCurrentUserId()
                            const isMe =
                                m.sender.id.toString() === currentUserId
                            const senderName = `${m.sender.first_name} ${m.sender.last_name}`
                            const activeConversationObj = conversations.find(
                                (conv) => conv.id === activeConversation
                            )
                            const isGroupChat =
                                activeConversationObj?.type === "group"

                            console.log("📱 Rendering message:", {
                                messageId: m.id,
                                messageSenderId: m.sender.id.toString(),
                                currentUserId: currentUserId,
                                isMe: isMe,
                                senderName: senderName,
                                hasContent: !!m.content,
                                content: m.content,
                                hasFileUrl: !!m.fileUrl,
                                fileUrl: m.fileUrl,
                                fileType: m.fileType,
                                fileName: m.fileName,
                            })

                            return (
                                <div
                                    key={m.id}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: isMe
                                            ? "flex-end"
                                            : "flex-start",
                                        marginBottom: 12,
                                    }}
                                >
                                    {!isMe && isGroupChat && (
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                marginBottom: 4,
                                                marginLeft: 8,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: "50%",
                                                    background: "#3155a1",
                                                    color: "#fff",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 10,
                                                    fontWeight: "bold",
                                                    marginRight: 6,
                                                }}
                                            >
                                                {m.sender.first_name.charAt(0)}
                                                {m.sender.last_name.charAt(0)}
                                            </div>
                                        </div>
                                    )}
                                    {/* Text message bubble - only show if there's text content */}
                                    {m.content && (
                                        <div
                                            className="cc-bubble"
                                            style={{
                                                background: isMe
                                                    ? "#007bff"
                                                    : "#fff",
                                                color: isMe ? "#fff" : "#000",
                                                padding: "8px 12px",
                                                borderRadius: isMe
                                                    ? "18px 18px 4px 18px"
                                                    : "18px 18px 18px 4px",
                                                wordWrap: "break-word",
                                                overflowWrap: "anywhere",
                                                border: "none",
                                                maxWidth: "70%",
                                                boxShadow:
                                                    "0 1px 2px rgba(0,0,0,0.1)",
                                                fontSize: "14px",
                                                lineHeight: "1.4",
                                            }}
                                        >
                                            {!isMe && isGroupChat && (
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: 500,
                                                        marginBottom: 4,
                                                        opacity: 0.8,
                                                    }}
                                                >
                                                    {senderName}
                                                </div>
                                            )}
                                            <div>{m.content}</div>
                                        </div>
                                    )}

                                    {/* Signature message display - matching UserChatScreen style */}
                                    {(m.signature ||
                                        (m.signatureId && m.status)) && (
                                        <div
                                            style={{
                                                background: "#fff",
                                                borderRadius: "12px",
                                                padding: "16px",
                                                width: "40%",
                                                marginTop: m.content
                                                    ? "4px"
                                                    : "0px",
                                                boxShadow:
                                                    "0 4px 8px rgba(0,0,0,0.1)",
                                                border: "1px solid #e5e7eb",
                                                alignSelf: isMe
                                                    ? "flex-end"
                                                    : "flex-start",
                                                cursor: "pointer",
                                            }}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                console.log(
                                                    "📋 E-signature tapped!"
                                                )
                                                setHeaderTab("signatures")
                                            }}
                                        >
                                            {/* Contract Header */}
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    marginBottom: "16px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: "48px",
                                                        height: "48px",
                                                        borderRadius: "50%",
                                                        backgroundColor:
                                                            "rgb(49, 85, 161)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "center",
                                                        marginRight: "16px",
                                                    }}
                                                >
                                                    <FileText
                                                        size={24}
                                                        color="#fff"
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: "bold",
                                                            color: "#333",
                                                        }}
                                                    >
                                                        Contract for Signature
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contract Title */}
                                            <div
                                                style={{ marginBottom: "16px" }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        color: "#333",
                                                        marginBottom: "8px",
                                                    }}
                                                >
                                                    Document Title
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#333",
                                                        backgroundColor:
                                                            "#f8f9fa",
                                                        padding: "12px",
                                                        borderRadius: "8px",
                                                    }}
                                                >
                                                    {m.signature?.title ||
                                                        m.title ||
                                                        "Contract for Signature"}
                                                </div>
                                            </div>

                                            {/* Contract Notes */}
                                            {(m.signature?.notes ||
                                                m.notes) && (
                                                <div
                                                    style={{
                                                        marginBottom: "16px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            color: "#333",
                                                            marginBottom: "8px",
                                                        }}
                                                    >
                                                        Instructions
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "11px",
                                                            color: "#666",
                                                            backgroundColor:
                                                                "#f8f9fa",
                                                            padding: "12px",
                                                            borderRadius: "8px",
                                                        }}
                                                    >
                                                        {m.signature?.notes ||
                                                            m.notes}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Due Date */}
                                            {(m.signature?.dueDate ||
                                                m.dueDate) && (
                                                <div
                                                    style={{
                                                        marginBottom: "16px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            color: "#333",
                                                            marginBottom: "8px",
                                                        }}
                                                    >
                                                        Due Date
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: "11px",
                                                            color: "#666",
                                                            backgroundColor:
                                                                "#f8f9fa",
                                                            padding: "12px",
                                                            borderRadius: "8px",
                                                        }}
                                                    >
                                                        {new Date(
                                                            m.signature
                                                                ?.dueDate ||
                                                                m.dueDate
                                                        ).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Status Display */}
                                            <div
                                                style={{
                                                    marginTop: "16px",
                                                    marginBottom: "16px",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: "12px",
                                                        fontWeight: "600",
                                                        color: "#333",
                                                        marginBottom: "8px",
                                                    }}
                                                >
                                                    Status
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: "11px",
                                                        color:
                                                            (m.signature
                                                                ?.status ||
                                                                m.status) ===
                                                            "signed"
                                                                ? "#059669"
                                                                : "#d97706",
                                                        backgroundColor:
                                                            (m.signature
                                                                ?.status ||
                                                                m.status) ===
                                                            "signed"
                                                                ? "#d1fae5"
                                                                : "#fef3c7",
                                                        padding: "12px",
                                                        borderRadius: "8px",
                                                        textAlign: "center",
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    {(m.signature?.status ||
                                                        m.status) === "signed"
                                                        ? "SIGNED"
                                                        : "PENDING"}
                                                </div>
                                            </div>

                                            {/* File URL Display for Pusher-completed signatures */}
                                            {m.completedViaPusher &&
                                                (m.signature?.fileUrl ||
                                                    m.fileUrl) && (
                                                    <div
                                                        style={{
                                                            marginBottom:
                                                                "16px",
                                                        }}
                                                    >
                                                        <img
                                                            src={
                                                                m.signature
                                                                    ?.fileUrl ||
                                                                m.fileUrl
                                                            }
                                                            alt="Signed Document"
                                                            style={{
                                                                width: "100%",
                                                                maxHeight: 200,
                                                                objectFit:
                                                                    "cover",
                                                                borderRadius: 4,
                                                                cursor: "pointer",
                                                            }}
                                                            onClick={() =>
                                                                window.open(
                                                                    m.signature
                                                                        ?.fileUrl ||
                                                                        m.fileUrl,
                                                                    "_blank"
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                )}

                                            {/* Signed File Display - Only show if not completed via Pusher */}
                                            {(m.signature?.status ||
                                                m.status) === "signed" &&
                                                (m.signature?.fileUrl ||
                                                    m.fileUrl) &&
                                                !m.completedViaPusher && (
                                                    <div
                                                        style={{
                                                            marginBottom:
                                                                "16px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "12px",
                                                                fontWeight:
                                                                    "600",
                                                                color: "#333",
                                                                marginBottom:
                                                                    "8px",
                                                            }}
                                                        >
                                                            Signed Document
                                                        </div>
                                                        <div
                                                            style={{
                                                                cursor: "pointer",
                                                                borderRadius:
                                                                    "8px",
                                                                overflow:
                                                                    "hidden",
                                                            }}
                                                            onClick={() =>
                                                                window.open(
                                                                    m.signature
                                                                        ?.fileUrl ||
                                                                        m.fileUrl,
                                                                    "_blank"
                                                                )
                                                            }
                                                        >
                                                            <img
                                                                src={
                                                                    m.signature
                                                                        ?.fileUrl ||
                                                                    m.fileUrl
                                                                }
                                                                alt="Signed Document"
                                                                style={{
                                                                    width: "100%",
                                                                    height: "100px",
                                                                    objectFit:
                                                                        "cover",
                                                                    borderRadius:
                                                                        "8px",
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Contract Actions */}
                                            <div style={{ marginTop: "16px" }}>
                                                {/* Sign Contract Button - Only show for receiver when not signed */}
                                                {!isMe &&
                                                (m.signature?.status ||
                                                    m.status) !== "signed" ? (
                                                    <button
                                                        style={{
                                                            width: "100%",
                                                            backgroundColor:
                                                                "rgb(49, 85, 161)",
                                                            borderRadius: "8px",
                                                            padding: "12px",
                                                            color: "#fff",
                                                            fontSize: "14px",
                                                            fontWeight: "500",
                                                            cursor: "pointer",
                                                            border: "none",
                                                        }}
                                                        onClick={() =>
                                                            openSignModal(m)
                                                        }
                                                    >
                                                        Sign Contract
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    {/* File attachment handling - completely separate from chat bubble */}
                                    {(m.fileUrl || m.file_url) &&
                                        !(
                                            m.signature ||
                                            (m.signatureId && m.status)
                                        ) &&
                                        (() => {
                                            // Check file type (similar to UserChatScreen logic)
                                            const fileUrl =
                                                m.fileUrl || m.file_url
                                            const fileType =
                                                m.fileType || m.file_type
                                            const hasImage =
                                                fileType &&
                                                fileType.startsWith("image/")
                                            const hasDocument =
                                                fileType && !hasImage

                                            console.log(
                                                "🖼️ Rendering message attachment:",
                                                {
                                                    messageId: m.id,
                                                    hasFileUrl: !!m.fileUrl,
                                                    hasFile_url: !!m.file_url,
                                                    fileUrl: m.fileUrl,
                                                    file_url: m.file_url,
                                                    finalFileUrl: fileUrl,
                                                    fileType: fileType,
                                                    fileName: m.fileName,
                                                    hasImage: hasImage,
                                                    hasDocument: hasDocument,
                                                    content: m.content,
                                                }
                                            )

                                            if (hasImage) {
                                                // Display image inline - clickable to open bigger view
                                                console.log(
                                                    "🖼️ Rendering image container for:",
                                                    m.fileName || "Image"
                                                )
                                                return (
                                                    <div
                                                        style={{
                                                            marginTop: m.content
                                                                ? 4
                                                                : 0,
                                                            background: "#fff",
                                                            borderRadius: 8,
                                                            padding: 8,
                                                            border: "1px solid #e0e0e0",
                                                            maxWidth: "70%",
                                                        }}
                                                    >
                                                        <img
                                                            src={fileUrl}
                                                            alt={
                                                                m.fileName ||
                                                                "Image"
                                                            }
                                                            onLoad={() => {
                                                                console.log(
                                                                    "✅ Image loaded successfully:",
                                                                    m.fileName ||
                                                                        "Image"
                                                                )
                                                            }}
                                                            onError={(e) => {
                                                                console.error(
                                                                    "❌ Image failed to load:",
                                                                    {
                                                                        fileName:
                                                                            m.fileName,
                                                                        fileUrl:
                                                                            m.fileUrl,
                                                                        error: e,
                                                                    }
                                                                )
                                                            }}
                                                            onClick={() => {
                                                                // Open image in bigger view
                                                                const newWindow =
                                                                    window.open(
                                                                        "",
                                                                        "_blank"
                                                                    )
                                                                newWindow
                                                                    .document
                                                                    .write(`
                                                                <html>
                                                                    <head>
                                                                        <title>${m.fileName || "Image"}</title>
                                                                        <style>
                                                                            body { 
                                                                                margin: 0; 
                                                                                padding: 20px; 
                                                                                background: #000; 
                                                                                display: flex; 
                                                                                justify-content: center; 
                                                                                align-items: center; 
                                                                                min-height: 100vh;
                                                                            }
                                                                            img { 
                                                                                max-width: 100%; 
                                                                                max-height: 100vh; 
                                                                                object-fit: contain; 
                                                                                cursor: pointer;
                                                                            }
                                                                        </style>
                                                                    </head>
                                                                    <body>
                                                                        <img src="${m.fileUrl}" alt="${m.fileName || "Image"}" onclick="window.close()" />
                                                                    </body>
                                                                </html>
                                                            `)
                                                                newWindow.document.close()
                                                            }}
                                                            style={{
                                                                width: "100%",
                                                                maxHeight: 200,
                                                                objectFit:
                                                                    "cover",
                                                                borderRadius: 4,
                                                                cursor: "pointer",
                                                            }}
                                                        />
                                                        {m.fileName && (
                                                            <div
                                                                style={{
                                                                    fontSize: 12,
                                                                    color: "#666",
                                                                    marginTop: 4,
                                                                }}
                                                            >
                                                                {m.fileName}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            } else if (hasDocument) {
                                                // Display document with proper icon and download functionality
                                                return (
                                                    <div
                                                        style={{
                                                            marginTop: m.content
                                                                ? 4
                                                                : 0,
                                                            background: "#fff",
                                                            borderRadius: 8,
                                                            padding: 12,
                                                            border: "1px solid #e0e0e0",
                                                            maxWidth: "70%",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: 12,
                                                            }}
                                                        >
                                                            {/* Document Icon */}
                                                            <div
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: 8,
                                                                    background:
                                                                        "#f8f9fa",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: 20,
                                                                    }}
                                                                >
                                                                    {getFileIcon(
                                                                        fileType
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {/* Document Info */}
                                                            <div
                                                                style={{
                                                                    flex: 1,
                                                                    minWidth: 0,
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        fontSize: 14,
                                                                        fontWeight: 500,
                                                                        color: "#333",
                                                                        marginBottom: 2,
                                                                        overflow:
                                                                            "hidden",
                                                                        textOverflow:
                                                                            "ellipsis",
                                                                        whiteSpace:
                                                                            "nowrap",
                                                                    }}
                                                                >
                                                                    {m.fileName ||
                                                                        "Document"}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "#666",
                                                                        textTransform:
                                                                            "uppercase",
                                                                        letterSpacing:
                                                                            "0.5px",
                                                                    }}
                                                                >
                                                                    {fileType
                                                                        ?.split(
                                                                            "/"
                                                                        )[1]
                                                                        ?.toUpperCase() ||
                                                                        "FILE"}
                                                                </div>
                                                            </div>

                                                            {/* Download Document Link */}
                                                            <a
                                                                href={fileUrl}
                                                                download={
                                                                    m.fileName ||
                                                                    "document"
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    borderRadius:
                                                                        "50%",
                                                                    background:
                                                                        "#007bff",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                    flexShrink: 0,
                                                                    textDecoration:
                                                                        "none",
                                                                    color: "#fff",
                                                                }}
                                                                title="Download document"
                                                            >
                                                                <svg
                                                                    width="16"
                                                                    height="16"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    style={{
                                                                        color: "#fff",
                                                                    }}
                                                                >
                                                                    <path
                                                                        d="M12 15.75L8.25 12L9.66 10.59L11.25 12.18V3H12.75V12.18L14.34 10.59L15.75 12L12 15.75Z"
                                                                        fill="currentColor"
                                                                    />
                                                                    <path
                                                                        d="M20.25 13.5V19.5C20.25 20.34 19.59 21 18.75 21H5.25C4.41 21 3.75 20.34 3.75 19.5V13.5H5.25V19.5H18.75V13.5H20.25Z"
                                                                        fill="currentColor"
                                                                    />
                                                                </svg>
                                                            </a>
                                                        </div>
                                                    </div>
                                                )
                                            } else {
                                                // Fallback for unknown file types - improved design
                                                return (
                                                    <div
                                                        style={{
                                                            marginTop: m.content
                                                                ? 4
                                                                : 0,
                                                            background: "#fff",
                                                            borderRadius: 8,
                                                            padding: 12,
                                                            border: "1px solid #e0e0e0",
                                                            maxWidth: "70%",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: 12,
                                                            }}
                                                        >
                                                            {/* File Icon */}
                                                            <div
                                                                style={{
                                                                    width: 40,
                                                                    height: 40,
                                                                    borderRadius: 8,
                                                                    background:
                                                                        "#f8f9fa",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: 20,
                                                                    }}
                                                                >
                                                                    {getFileIcon(
                                                                        fileType
                                                                    )}
                                                                </span>
                                                            </div>

                                                            {/* File Info */}
                                                            <div
                                                                style={{
                                                                    flex: 1,
                                                                    minWidth: 0,
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        fontSize: 14,
                                                                        fontWeight: 500,
                                                                        color: "#333",
                                                                        marginBottom: 2,
                                                                        overflow:
                                                                            "hidden",
                                                                        textOverflow:
                                                                            "ellipsis",
                                                                        whiteSpace:
                                                                            "nowrap",
                                                                    }}
                                                                >
                                                                    {m.fileName ||
                                                                        "File"}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: "#666",
                                                                        textTransform:
                                                                            "uppercase",
                                                                        letterSpacing:
                                                                            "0.5px",
                                                                    }}
                                                                >
                                                                    {fileType
                                                                        ?.split(
                                                                            "/"
                                                                        )[1]
                                                                        ?.toUpperCase() ||
                                                                        "FILE"}
                                                                </div>
                                                            </div>

                                                            {/* Download File Link */}
                                                            <a
                                                                href={fileUrl}
                                                                download={
                                                                    m.fileName ||
                                                                    "file"
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    width: 32,
                                                                    height: 32,
                                                                    borderRadius:
                                                                        "50%",
                                                                    background:
                                                                        "#007bff",
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    justifyContent:
                                                                        "center",
                                                                    flexShrink: 0,
                                                                    textDecoration:
                                                                        "none",
                                                                    color: "#fff",
                                                                }}
                                                                title="Download file"
                                                            >
                                                                <svg
                                                                    width="16"
                                                                    height="16"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    style={{
                                                                        color: "#fff",
                                                                    }}
                                                                >
                                                                    <path
                                                                        d="M12 15.75L8.25 12L9.66 10.59L11.25 12.18V3H12.75V12.18L14.34 10.59L15.75 12L12 15.75Z"
                                                                        fill="currentColor"
                                                                    />
                                                                    <path
                                                                        d="M20.25 13.5V19.5C20.25 20.34 19.59 21 18.75 21H5.25C4.41 21 3.75 20.34 3.75 19.5V13.5H5.25V19.5H18.75V13.5H20.25Z"
                                                                        fill="currentColor"
                                                                    />
                                                                </svg>
                                                            </a>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        })()}

                                    <div
                                        style={{
                                            fontSize: 11,
                                            color: "#999",
                                            marginTop: 4,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                        }}
                                    >
                                        {new Date(
                                            m.createdAt
                                        ).toLocaleTimeString([], {
                                            hour: "numeric",
                                            minute: "2-digit",
                                            hour12: true,
                                        })}
                                        {m.status === "sending" && (
                                            <div
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    border: "2px solid #ccc",
                                                    borderTop:
                                                        "2px solid #007bff",
                                                    borderRadius: "50%",
                                                    animation:
                                                        "spin 1s linear infinite",
                                                }}
                                                title="Sending..."
                                            />
                                        )}
                                        {m.status === "failed" && (
                                            <span
                                                style={{
                                                    color: "#dc3545",
                                                    fontSize: 10,
                                                }}
                                                title="Failed to send"
                                            >
                                                ⚠️
                                            </span>
                                        )}
                                        {m.status === "sent" && isMe && (
                                            <span
                                                style={{
                                                    color: "#28a745",
                                                    fontSize: 10,
                                                }}
                                                title="Sent"
                                            >
                                                ✓
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Composer */}
                <div
                    className="cc-composer"
                    style={{
                        padding: 12,
                        borderTop: "1px solid #ddd",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        background: "#fff",
                    }}
                >
                    {/* Emoji */}
                    <div style={{ position: "relative" }}>
                        <motion.button
                            onClick={() => setShowEmojiPicker((v) => !v)}
                            style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                            }}
                            whileHover={{ opacity: 0.7 }}
                            title="Emoji"
                        >
                            <Smile size={20} color="#888" />
                        </motion.button>
                        <AnimatePresence>
                            {showEmojiPicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 6 }}
                                    style={{
                                        position: "absolute",
                                        bottom: 44,
                                        left: 0,
                                        zIndex: 50,
                                    }}
                                >
                                    <FallbackEmojiPicker />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Attach */}
                    <label
                        htmlFor="file-upload"
                        style={{ cursor: "pointer" }}
                        title="Attach file"
                    >
                        <Paperclip size={20} color="#888" />
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        onChange={(e) =>
                            setAttachment(e.target.files?.[0] || null)
                        }
                        style={{ display: "none" }}
                    />

                    {/* Request e-signature */}
                    <button
                        onClick={openRequestModal}
                        style={{
                            background: "transparent",
                            border: "1px solid #e5e7eb",
                            borderRadius: 10,
                            padding: "6px 10px",
                            color: "#111827",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                        }}
                        title="Request an e-signature"
                    >
                        Request signature
                    </button>

                    {/* Input */}
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Type a message…"
                        style={{
                            flex: 1,
                            minWidth: 0,
                            padding: "10px 14px",
                            borderRadius: 20,
                            border: "1px solid #ddd",
                            outline: "none",
                            fontSize: 14,
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                    />

                    {/* Send */}
                    <motion.button
                        onClick={handleSend}
                        disabled={isLoading}
                        style={{
                            background: ACCENT,
                            border: "none",
                            borderRadius: 20,
                            width: 44,
                            height: 44,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            opacity: isLoading ? 0.7 : 1,
                            flex: "0 0 auto",
                        }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Send size={20} color="#fff" />
                    </motion.button>
                </div>
            </div>

            {/* Signature modal */}
            <AnimatePresence>
                {showSignModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 100,
                            padding: 16,
                        }}
                        onClick={() => !isLoading && setShowSignModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            style={{
                                width: 520,
                                maxWidth: "96vw",
                                background: "#fff",
                                borderRadius: 16,
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
                                padding: 16,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <h3 style={{ margin: 0 }}>Sign request</h3>
                                <button
                                    onClick={() => setShowSignModal(false)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p
                                style={{
                                    marginTop: 8,
                                    color: "#6b7280",
                                    fontSize: 14,
                                }}
                            >
                                Draw your signature below. It will be saved for
                                one-click signing later.
                            </p>

                            <div
                                style={{
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 12,
                                    overflow: "hidden",
                                    background: "#fff",
                                }}
                            >
                                <canvas
                                    ref={canvasRef}
                                    width={480}
                                    height={200}
                                    style={{
                                        width: "100%",
                                        height: 200,
                                        touchAction: "none",
                                        cursor: "crosshair",
                                    }}
                                    onMouseDown={canvasStart}
                                    onMouseMove={canvasMove}
                                    onMouseUp={canvasEnd}
                                    onMouseLeave={canvasEnd}
                                    onTouchStart={canvasStart}
                                    onTouchMove={canvasMove}
                                    onTouchEnd={canvasEnd}
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginTop: 12,
                                    gap: 8,
                                    flexWrap: "wrap",
                                }}
                            >
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button
                                        onClick={clearSignature}
                                        style={{
                                            padding: "8px 12px",
                                            borderRadius: 8,
                                            border: "1px solid #e5e7eb",
                                            background: "#fff",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Clear
                                    </button>
                                    {hasSavedSignature && (
                                        <button
                                            onClick={signWithSaved}
                                            disabled={isLoading}
                                            style={{
                                                padding: "8px 12px",
                                                borderRadius: 8,
                                                border: "1px solid #e5e7eb",
                                                background: "#fff",
                                                cursor: "pointer",
                                                opacity: isLoading ? 0.7 : 1,
                                            }}
                                        >
                                            Use saved signature
                                        </button>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        console.log(
                                            "🔘 Save signature button clicked!"
                                        )
                                        saveSignature()
                                    }}
                                    disabled={isLoading}
                                    style={{
                                        padding: "8px 14px",
                                        borderRadius: 8,
                                        border: "none",
                                        background: ACCENT,
                                        color: "#fff",
                                        cursor: "pointer",
                                        opacity: isLoading ? 0.8 : 1,
                                    }}
                                >
                                    {isLoading ? "Saving…" : "Save signature"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Request Signature modal */}
            <AnimatePresence>
                {showRequestModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 110,
                            padding: 16,
                        }}
                        onClick={() => !isLoading && setShowRequestModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            style={{
                                width: 520,
                                maxWidth: "96vw",
                                background: "#fff",
                                borderRadius: 16,
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
                                padding: 16,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <h3 style={{ margin: 0 }}>
                                    Request e-signature
                                </h3>
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div
                                style={{
                                    display: "grid",
                                    gap: 12,
                                    marginTop: 12,
                                }}
                            >
                                <div>
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontSize: 12,
                                            color: "#6b7280",
                                            marginBottom: 4,
                                        }}
                                    >
                                        <TypeIcon size={14} /> Title (required)
                                    </label>
                                    <input
                                        value={reqTitle}
                                        onChange={(e) =>
                                            setReqTitle(e.target.value)
                                        }
                                        placeholder="e.g., Approve RFI #31"
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            borderRadius: 10,
                                            border: "1px solid #e5e7eb",
                                            outline: "none",
                                        }}
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontSize: 12,
                                            color: "#6b7280",
                                            marginBottom: 4,
                                        }}
                                    >
                                        <StickyIcon size={14} /> Notes
                                        (optional)
                                    </label>
                                    <textarea
                                        value={reqNotes}
                                        onChange={(e) =>
                                            setReqNotes(e.target.value)
                                        }
                                        placeholder="Context, references, what exactly is being approved…"
                                        rows={4}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            borderRadius: 10,
                                            border: "1px solid #e5e7eb",
                                            outline: "none",
                                            resize: "vertical",
                                        }}
                                    />
                                </div>

                                <div>
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 6,
                                            fontSize: 12,
                                            color: "#6b7280",
                                            marginBottom: 4,
                                        }}
                                    >
                                        <CalendarIcon size={14} /> Due date
                                        (optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={reqDue}
                                        onChange={(e) =>
                                            setReqDue(e.target.value)
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            borderRadius: 10,
                                            border: "1px solid #e5e7eb",
                                            outline: "none",
                                        }}
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 10,
                                    marginTop: 16,
                                }}
                            >
                                <button
                                    onClick={() => setShowRequestModal(false)}
                                    style={{
                                        background: "#fff",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 10,
                                        padding: "8px 12px",
                                        cursor: "pointer",
                                        color: "#111827",
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={sendSignatureRequest}
                                    disabled={isLoading || !reqTitle.trim()}
                                    style={{
                                        background: ACCENT,
                                        border: "none",
                                        borderRadius: 10,
                                        padding: "8px 14px",
                                        cursor: "pointer",
                                        color: "#fff",
                                        opacity:
                                            isLoading || !reqTitle.trim()
                                                ? 0.7
                                                : 1,
                                    }}
                                >
                                    {isLoading ? "Sending…" : "Send request"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Invite modal */}
            <AnimatePresence>
                {showInviteModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.45)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 120,
                            padding: 16,
                        }}
                        onClick={() => !inviteBusy && setShowInviteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            style={{
                                width: 520,
                                maxWidth: "96vw",
                                background: "#fff",
                                borderRadius: 16,
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
                                padding: 16,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <h3 style={{ margin: 0 }}>
                                    Invite a company/person
                                </h3>
                                <button
                                    onClick={() => setShowInviteModal(false)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <p
                                style={{
                                    marginTop: 8,
                                    color: "#6b7280",
                                    fontSize: 14,
                                }}
                            >
                                They’ll get access to the{" "}
                                <strong>Contractor Communications</strong>{" "}
                                feature with <strong>Base</strong> permissions
                                after completing company registration from the
                                link below.
                            </p>

                            <div style={{ marginTop: 12 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: 12,
                                        color: "#6b7280",
                                        marginBottom: 4,
                                    }}
                                >
                                    Recipient email
                                </label>
                                <input
                                    value={inviteEmail}
                                    onChange={(e) =>
                                        setInviteEmail(e.target.value)
                                    }
                                    placeholder="name@company.com"
                                    type="email"
                                    style={{
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 10,
                                        border: "1px solid #e5e7eb",
                                        outline: "none",
                                    }}
                                />
                            </div>

                            {inviteError && (
                                <div
                                    style={{
                                        marginTop: 8,
                                        color: "#b91c1c",
                                        fontSize: 13,
                                    }}
                                >
                                    {inviteError}
                                </div>
                            )}

                            {!inviteLink ? (
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        gap: 10,
                                        marginTop: 16,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <button
                                        onClick={() =>
                                            setShowInviteModal(false)
                                        }
                                        style={{
                                            background: "#fff",
                                            border: "1px solid #e5e7eb",
                                            borderRadius: 10,
                                            padding: "8px 12px",
                                            cursor: "pointer",
                                            color: "#111827",
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={createInvite}
                                        disabled={inviteBusy}
                                        style={{
                                            background: ACCENT,
                                            border: "none",
                                            borderRadius: 10,
                                            padding: "8px 14px",
                                            cursor: "pointer",
                                            color: "#fff",
                                            opacity: inviteBusy ? 0.7 : 1,
                                        }}
                                    >
                                        {inviteBusy
                                            ? "Creating…"
                                            : "Create invite"}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ marginTop: 16 }}>
                                    <label
                                        style={{
                                            display: "block",
                                            fontSize: 12,
                                            color: "#6b7280",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Invite link
                                    </label>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <input
                                            value={inviteLink}
                                            readOnly
                                            style={{
                                                flex: 1,
                                                minWidth: 260,
                                                padding: "10px 12px",
                                                borderRadius: 10,
                                                border: "1px solid #e5e7eb",
                                                outline: "none",
                                            }}
                                        />
                                        <button
                                            onClick={() =>
                                                copyToClipboard(inviteLink!)
                                            }
                                            style={{
                                                background: "#fff",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 10,
                                                padding: "8px 12px",
                                                cursor: "pointer",
                                                color: "#111827",
                                            }}
                                        >
                                            Copy
                                        </button>
                                        <a
                                            href={`mailto:${encodeURIComponent(inviteEmail)}?subject=${encodeURIComponent(
                                                "You're invited to Contractor Communications"
                                            )}&body=${encodeURIComponent(`You've been invited to collaborate on our project.\n\nClick to register and get Base access:\n${inviteLink}\n\nThanks!`)}`}
                                            style={{
                                                textDecoration: "none",
                                                background: ACCENT,
                                                color: "#fff",
                                                borderRadius: 10,
                                                padding: "8px 12px",
                                            }}
                                        >
                                            Send email
                                        </a>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Employee Selection Modal */}
            <AnimatePresence>
                {showFabModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 100,
                            padding: 16,
                        }}
                        onClick={() => {
                            setShowFabModal(false)
                            setSelectedProject(null)
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            style={{
                                background: "#fff",
                                borderRadius: 16,
                                padding: 24,
                                maxWidth: 700,
                                width: "100%",
                                maxHeight: "90vh",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                                display: "flex",
                                flexDirection: "column",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 20,
                                }}
                            >
                                <h3 style={{ margin: 0, color: "#333" }}>
                                    Create Conversation
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowFabModal(false)
                                        setSelectedProject(null)
                                    }}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 4,
                                    }}
                                >
                                    <X size={20} color="#666" />
                                </button>
                            </div>

                            {/* Create Project Chat Section - Always show when project is selected */}
                            {selectedProject && (
                                <div style={{ marginBottom: 16 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "16px 20px",
                                            background:
                                                employees.length > 0
                                                    ? "#3155a1"
                                                    : "#e5e7eb",
                                            border: "none",
                                            borderRadius: 16,
                                            cursor:
                                                employees.length > 0
                                                    ? "pointer"
                                                    : "not-allowed",
                                            transition: "all 0.3s ease",
                                            opacity:
                                                employees.length > 0 ? 1 : 0.6,
                                            boxShadow:
                                                employees.length > 0
                                                    ? "0 4px 12px rgba(59, 130, 246, 0.3)"
                                                    : "0 2px 4px rgba(0, 0, 0, 0.1)",
                                            position: "relative",
                                            overflow: "hidden",
                                        }}
                                        onClick={async () => {
                                            if (
                                                employees.length === 0 ||
                                                creatingProjectConversation
                                            )
                                                return

                                            console.log(
                                                "Create Project Chat clicked for project:",
                                                selectedProject.name
                                            )

                                            setCreatingProjectConversation(true)
                                            setProjectConversationError(null)

                                            try {
                                                const projectConversation =
                                                    await createProjectConversation(
                                                        selectedProject.id
                                                    )
                                                console.log(
                                                    "✅ Project conversation created:",
                                                    projectConversation
                                                )

                                                // Close modal
                                                setShowFabModal(false)

                                                // TODO: Optionally refresh conversations list or navigate to new conversation
                                            } catch (error) {
                                                console.error(
                                                    "❌ Failed to create project conversation:",
                                                    error
                                                )
                                                console.error(
                                                    "❌ Error message:",
                                                    error.message
                                                )
                                                console.error(
                                                    "❌ Error toString:",
                                                    error.toString()
                                                )
                                                // Check if it's a 400 error (conversation already exists)
                                                if (
                                                    error.message &&
                                                    error.message.includes(
                                                        "status: 400"
                                                    )
                                                ) {
                                                    setProjectConversationError(
                                                        "Conversation already exists"
                                                    )
                                                } else {
                                                    setProjectConversationError(
                                                        error.message ||
                                                            "Failed to create project conversation"
                                                    )
                                                }
                                            } finally {
                                                setCreatingProjectConversation(
                                                    false
                                                )
                                            }
                                        }}
                                        onMouseEnter={(e) => {
                                            if (
                                                employees.length > 0 &&
                                                !creatingProjectConversation
                                            ) {
                                                e.target.style.transform =
                                                    "translateY(-2px)"
                                                e.target.style.boxShadow =
                                                    "0 8px 20px rgba(59, 130, 246, 0.4)"
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (employees.length > 0) {
                                                e.target.style.transform =
                                                    "translateY(0)"
                                                e.target.style.boxShadow =
                                                    "0 4px 12px rgba(59, 130, 246, 0.3)"
                                            }
                                        }}
                                    >
                                        {/* Decorative elements */}
                                        <div
                                            style={{
                                                position: "absolute",
                                                top: -10,
                                                right: -10,
                                                width: 40,
                                                height: 40,
                                                borderRadius: "50%",
                                                background:
                                                    employees.length > 0
                                                        ? "rgba(255, 255, 255, 0.2)"
                                                        : "rgba(255, 255, 255, 0.1)",
                                                opacity: 0.6,
                                            }}
                                        />
                                        <div
                                            style={{
                                                position: "absolute",
                                                bottom: -5,
                                                left: -5,
                                                width: 30,
                                                height: 30,
                                                borderRadius: "50%",
                                                background:
                                                    employees.length > 0
                                                        ? "rgba(255, 255, 255, 0.15)"
                                                        : "rgba(255, 255, 255, 0.1)",
                                                opacity: 0.4,
                                            }}
                                        />

                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 16,
                                                position: "relative",
                                                zIndex: 1,
                                                flex: 1,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: 48,
                                                    height: 48,
                                                    borderRadius: "50%",
                                                    background:
                                                        employees.length > 0
                                                            ? "rgba(255, 255, 255, 0.2)"
                                                            : "rgba(107, 114, 128, 0.2)",
                                                    color:
                                                        employees.length > 0
                                                            ? "#ffffff"
                                                            : "#6b7280",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 20,
                                                    fontWeight: "bold",
                                                    backdropFilter:
                                                        "blur(10px)",
                                                    border:
                                                        employees.length > 0
                                                            ? "2px solid rgba(255, 255, 255, 0.3)"
                                                            : "2px solid rgba(107, 114, 128, 0.3)",
                                                }}
                                            >
                                                {creatingProjectConversation ? (
                                                    <div
                                                        style={{
                                                            width: 20,
                                                            height: 20,
                                                            border: "2px solid rgba(255, 255, 255, 0.3)",
                                                            borderTop:
                                                                "2px solid #ffffff",
                                                            borderRadius: "50%",
                                                            animation:
                                                                "spin 1s linear infinite",
                                                        }}
                                                    />
                                                ) : (
                                                    "+"
                                                )}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 700,
                                                        fontSize: 16,
                                                        color:
                                                            employees.length > 0
                                                                ? "#ffffff"
                                                                : "#6b7280",
                                                        marginBottom: 4,
                                                        textShadow:
                                                            employees.length > 0
                                                                ? "0 1px 2px rgba(0, 0, 0, 0.1)"
                                                                : "none",
                                                    }}
                                                >
                                                    Create Project Chat
                                                    {creatingProjectConversation && (
                                                        <span
                                                            style={{
                                                                marginLeft: 8,
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    animation:
                                                                        "pulse 1s infinite",
                                                                }}
                                                            >
                                                                .
                                                            </span>
                                                            <span
                                                                style={{
                                                                    animation:
                                                                        "pulse 1s infinite 0.2s",
                                                                }}
                                                            >
                                                                .
                                                            </span>
                                                            <span
                                                                style={{
                                                                    animation:
                                                                        "pulse 1s infinite 0.4s",
                                                                }}
                                                            >
                                                                .
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 13,
                                                        color:
                                                            employees.length > 0
                                                                ? "rgba(255, 255, 255, 0.9)"
                                                                : "#9ca3af",
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    {employees.length > 0
                                                        ? `Start conversation for ${selectedProject.name}`
                                                        : `No employees assigned to ${selectedProject.name}`}
                                                </div>
                                            </div>
                                            {employees.length > 0 && (
                                                <div
                                                    style={{
                                                        color: "#ffffff",
                                                        opacity: 0.8,
                                                        fontSize: 18,
                                                        fontWeight: "bold",
                                                    }}
                                                >
                                                    →
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Project Selection */}
                            <div style={{ marginBottom: 16 }}>
                                <label
                                    style={{
                                        display: "block",
                                        fontSize: 12,
                                        color: "#6b7280",
                                        marginBottom: 6,
                                        fontWeight: 500,
                                    }}
                                >
                                    Select Project
                                </label>
                                <button
                                    onClick={openProjectModal}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 12,
                                        background: "#fff",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        fontSize: 14,
                                        color: selectedProject
                                            ? "#333"
                                            : "#9ca3af",
                                    }}
                                >
                                    <span>
                                        {selectedProject
                                            ? selectedProject.name
                                            : "Choose a project..."}
                                    </span>
                                    <ChevronDown size={16} color="#9ca3af" />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div style={{ marginBottom: 16 }}>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        background: "#f0f0f0",
                                        borderRadius: 12,
                                        padding: "8px 12px",
                                    }}
                                >
                                    <Search size={16} color="#888" />
                                    <input
                                        placeholder="Search employees..."
                                        value={employeeSearchQuery}
                                        onChange={(e) =>
                                            setEmployeeSearchQuery(
                                                e.target.value
                                            )
                                        }
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            marginLeft: 8,
                                            flex: 1,
                                            outline: "none",
                                            fontSize: 14,
                                            color: "#555",
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Error Messages */}
                            {conversationError && (
                                <div
                                    style={{
                                        marginBottom: 16,
                                        padding: "12px 16px",
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        borderRadius: 12,
                                        color: "#dc2626",
                                        fontSize: 14,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <div>{conversationError}</div>
                                    <button
                                        onClick={() =>
                                            setConversationError(null)
                                        }
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#dc2626",
                                            fontSize: 18,
                                            marginLeft: "auto",
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            {projectConversationError && (
                                <div
                                    style={{
                                        marginBottom: 16,
                                        padding: "12px 16px",
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        borderRadius: 12,
                                        color: "#dc2626",
                                        fontSize: 14,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                    }}
                                >
                                    <div>{projectConversationError}</div>
                                    <button
                                        onClick={() =>
                                            setProjectConversationError(null)
                                        }
                                        style={{
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: "#dc2626",
                                            fontSize: 18,
                                            marginLeft: "auto",
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            )}

                            {/* Employees List */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    minHeight: 300,
                                    maxHeight: 600,
                                }}
                            >
                                {loadingEmployees ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 40,
                                            color: "#666",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 20,
                                                height: 20,
                                                border: "2px solid #ddd",
                                                borderTop: "2px solid #3155a1",
                                                borderRadius: "50%",
                                                animation:
                                                    "spin 1s linear infinite",
                                                marginRight: 8,
                                            }}
                                        />
                                        Loading employees...
                                    </div>
                                ) : filteredEmployees.length === 0 ? (
                                    <div
                                        style={{
                                            textAlign: "center",
                                            padding: 40,
                                            color: "#666",
                                        }}
                                    >
                                        {employeeSearchQuery.trim()
                                            ? "No employees found matching your search."
                                            : "No employees available."}
                                    </div>
                                ) : (
                                    filteredEmployees.map((employee) => {
                                        // Check if employees should be displayed as static (non-interactive)
                                        const isStaticDisplay =
                                            selectedProject &&
                                            employees.length > 0

                                        return (
                                            <motion.div
                                                key={employee.id}
                                                onClick={
                                                    !isStaticDisplay
                                                        ? async () => {
                                                              if (
                                                                  creatingConversation
                                                              )
                                                                  return // Prevent multiple clicks

                                                              console.log(
                                                                  "Employee selected:",
                                                                  employee
                                                              )

                                                              setCreatingConversation(
                                                                  true
                                                              )
                                                              setCreatingForEmployee(
                                                                  employee.id
                                                              )
                                                              setConversationError(
                                                                  null
                                                              ) // Clear previous errors

                                                              try {
                                                                  // Create conversation with selected employee
                                                                  const conversationData =
                                                                      {
                                                                          type: "private",
                                                                          participantIds:
                                                                              [
                                                                                  employee.id,
                                                                              ],
                                                                      }

                                                                  console.log(
                                                                      "Creating conversation with employee:",
                                                                      employee.first_name,
                                                                      employee.last_name
                                                                  )
                                                                  const newConversation =
                                                                      await createConversation(
                                                                          conversationData
                                                                      )
                                                                  console.log(
                                                                      "✅ Conversation created:",
                                                                      newConversation
                                                                  )

                                                                  // Close modal
                                                                  setShowFabModal(
                                                                      false
                                                                  )

                                                                  // TODO: Optionally refresh conversations list or navigate to new conversation
                                                              } catch (error) {
                                                                  console.error(
                                                                      "❌ Failed to create conversation:",
                                                                      error
                                                                  )
                                                                  console.error(
                                                                      "❌ Error message:",
                                                                      error.message
                                                                  )
                                                                  console.error(
                                                                      "❌ Error toString:",
                                                                      error.toString()
                                                                  )
                                                                  // Check if it's a 400 error (conversation already exists)
                                                                  if (
                                                                      error.message &&
                                                                      error.message.includes(
                                                                          "status: 400"
                                                                      )
                                                                  ) {
                                                                      setConversationError(
                                                                          "Conversation already exists"
                                                                      )
                                                                  } else {
                                                                      setConversationError(
                                                                          error.message ||
                                                                              "Failed to create conversation"
                                                                      )
                                                                  }
                                                              } finally {
                                                                  setCreatingConversation(
                                                                      false
                                                                  )
                                                                  setCreatingForEmployee(
                                                                      null
                                                                  )
                                                              }
                                                          }
                                                        : undefined
                                                }
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    padding: "12px 16px",
                                                    border: "1px solid #e5e7eb",
                                                    borderRadius: 12,
                                                    marginBottom: 8,
                                                    cursor: isStaticDisplay
                                                        ? "default"
                                                        : creatingConversation
                                                          ? "not-allowed"
                                                          : "pointer",
                                                    opacity: isStaticDisplay
                                                        ? 0.7
                                                        : 1,
                                                    background:
                                                        creatingConversation ||
                                                        (selectedProject &&
                                                            employees.length >
                                                                0)
                                                            ? "#f5f5f5"
                                                            : "#fff",
                                                    transition: "all 0.2s ease",
                                                    opacity:
                                                        creatingConversation ||
                                                        (selectedProject &&
                                                            employees.length >
                                                                0)
                                                            ? 0.7
                                                            : 1,
                                                }}
                                                whileHover={
                                                    creatingConversation ||
                                                    isStaticDisplay
                                                        ? {}
                                                        : {
                                                              background:
                                                                  "#f8f9ff",
                                                              borderColor:
                                                                  "#3155a1",
                                                          }
                                                }
                                                whileTap={
                                                    creatingConversation ||
                                                    isStaticDisplay
                                                        ? {}
                                                        : { scale: 0.98 }
                                                }
                                            >
                                                <div
                                                    style={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: "50%",
                                                        background: "#3155a1",
                                                        color: "#fff",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent:
                                                            "center",
                                                        fontSize: 14,
                                                        fontWeight: "bold",
                                                        marginRight: 12,
                                                    }}
                                                >
                                                    {(employee.first_name?.charAt(
                                                        0
                                                    ) || "") +
                                                        (employee.last_name?.charAt(
                                                            0
                                                        ) || "")}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontWeight: 500,
                                                            fontSize: 14,
                                                            color: "#333",
                                                            marginBottom: 2,
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: 8,
                                                        }}
                                                    >
                                                        {`${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
                                                            "Unknown Employee"}
                                                        {creatingConversation &&
                                                            creatingForEmployee ===
                                                                employee.id && (
                                                                <div
                                                                    style={{
                                                                        width: 16,
                                                                        height: 16,
                                                                        border: "2px solid #ddd",
                                                                        borderTop:
                                                                            "2px solid #3155a1",
                                                                        borderRadius:
                                                                            "50%",
                                                                        animation:
                                                                            "spin 1s linear infinite",
                                                                    }}
                                                                />
                                                            )}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            color: "#666",
                                                        }}
                                                    >
                                                        {creatingConversation &&
                                                        creatingForEmployee ===
                                                            employee.id
                                                            ? "Creating conversation..."
                                                            : employee.email ||
                                                              "No email"}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    })
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Project Selection Modal */}
            <AnimatePresence>
                {showProjectModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: "fixed",
                            inset: 0,
                            background: "rgba(0,0,0,0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 100,
                            padding: 16,
                        }}
                        onClick={() => setShowProjectModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            style={{
                                background: "#fff",
                                borderRadius: 16,
                                padding: 24,
                                maxWidth: 500,
                                width: "100%",
                                maxHeight: "80vh",
                                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
                                display: "flex",
                                flexDirection: "column",
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: 20,
                                }}
                            >
                                <h3 style={{ margin: 0, color: "#333" }}>
                                    Select Project
                                </h3>
                                <button
                                    onClick={() => setShowProjectModal(false)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 4,
                                    }}
                                >
                                    <X size={20} color="#666" />
                                </button>
                            </div>

                            {/* Projects List */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: "auto",
                                    minHeight: 200,
                                    maxHeight: 400,
                                }}
                            >
                                {loadingProjects ? (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: 40,
                                            color: "#666",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: 20,
                                                height: 20,
                                                border: "2px solid #ddd",
                                                borderTop: "2px solid #3155a1",
                                                borderRadius: "50%",
                                                animation:
                                                    "spin 1s linear infinite",
                                                marginRight: 8,
                                            }}
                                        />
                                        Loading projects...
                                    </div>
                                ) : projects.length === 0 ? (
                                    <div
                                        style={{
                                            textAlign: "center",
                                            padding: 40,
                                            color: "#666",
                                        }}
                                    >
                                        No projects available.
                                    </div>
                                ) : (
                                    projects.map((project) => (
                                        <motion.div
                                            key={project.id}
                                            onClick={async () => {
                                                console.log(
                                                    "Project selected:",
                                                    project
                                                )
                                                setSelectedProject(project)
                                                setShowProjectModal(false)

                                                // Fetch employees assigned to this project
                                                setLoadingEmployees(true)
                                                try {
                                                    const projectEmployeesData =
                                                        await getEmployeesAssignedToProject(
                                                            project.id
                                                        )
                                                    console.log(
                                                        "📋 Project employees data received:",
                                                        projectEmployeesData
                                                    )

                                                    // Handle different response formats
                                                    let employeesList = []
                                                    if (
                                                        Array.isArray(
                                                            projectEmployeesData
                                                        )
                                                    ) {
                                                        employeesList =
                                                            projectEmployeesData
                                                    } else if (
                                                        projectEmployeesData &&
                                                        Array.isArray(
                                                            projectEmployeesData.assignedTo
                                                        )
                                                    ) {
                                                        employeesList =
                                                            projectEmployeesData.assignedTo
                                                    } else if (
                                                        projectEmployeesData &&
                                                        Array.isArray(
                                                            projectEmployeesData.data
                                                        )
                                                    ) {
                                                        employeesList =
                                                            projectEmployeesData.data
                                                    }

                                                    setEmployees(employeesList)
                                                    setFilteredEmployees(
                                                        employeesList
                                                    )
                                                    console.log(
                                                        "✅ Project employees set:",
                                                        employeesList.length
                                                    )
                                                } catch (error) {
                                                    console.error(
                                                        "❌ Failed to fetch project employees:",
                                                        error
                                                    )
                                                    setEmployees([])
                                                    setFilteredEmployees([])
                                                } finally {
                                                    setLoadingEmployees(false)
                                                }
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                padding: "12px 16px",
                                                border: "1px solid #e5e7eb",
                                                borderRadius: 12,
                                                marginBottom: 8,
                                                cursor: "pointer",
                                                background: "#fff",
                                                transition: "all 0.2s ease",
                                            }}
                                            whileHover={{
                                                background: "#f8f9ff",
                                                borderColor: "#3155a1",
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <div
                                                style={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: "50%",
                                                    background: "#3155a1",
                                                    color: "#fff",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 14,
                                                    fontWeight: "bold",
                                                    marginRight: 12,
                                                }}
                                            >
                                                {project.name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() || "P"}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontWeight: 500,
                                                        fontSize: 14,
                                                        color: "#333",
                                                        marginBottom: 2,
                                                    }}
                                                >
                                                    {project.name ||
                                                        "Unnamed Project"}
                                                </div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: "#666",
                                                    }}
                                                >
                                                    {project.description ||
                                                        "No description"}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
