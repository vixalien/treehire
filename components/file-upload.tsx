"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, File, X, AlertCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploadProps {
  onFileUploaded: (url: string, content: string) => void
  accept: string
  label: string
}

export function FileUpload({ onFileUploaded, accept, label }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size must be less than 10MB")
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/plain",
      ]

      if (!allowedTypes.includes(file.type)) {
        throw new Error("Please upload a PDF, DOCX, DOC, or TXT file")
      }

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload file to Supabase Storage
      const { data, error: uploadError } = await supabase.storage.from("interview-files").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("interview-files").getPublicUrl(fileName)

      // Extract text content
      const content = await extractTextFromFile(file)

      setUploadedFile(file.name)
      onFileUploaded(publicUrl, content)
    } catch (error: any) {
      console.error("Error uploading file:", error)
      setError(error.message || "Failed to upload file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const extractTextFromFile = async (file: File): Promise<string> => {
    try {
      if (file.type === "text/plain") {
        return await file.text()
      }

      // For PDF and DOCX files, we'll return a structured placeholder
      // In production, you'd use libraries like pdf-parse, mammoth, etc.
      const fileSize = (file.size / 1024 / 1024).toFixed(2)
      const fileType = file.type.includes("pdf") ? "PDF" : file.type.includes("word") ? "Word Document" : "Document"

      return `File Information:
- Name: ${file.name}
- Type: ${fileType}
- Size: ${fileSize}MB
- Upload Date: ${new Date().toISOString()}

Note: This is a placeholder for ${fileType} content. In a production environment, this would contain the actual extracted text from the document using appropriate parsing libraries (pdf-parse for PDFs, mammoth for Word documents).`
    } catch (error) {
      console.error("Error extracting text:", error)
      return `[File: ${file.name} - Text extraction failed, but file was uploaded successfully]`
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setError(null)
    onFileUploaded("", "")
  }

  return (
    <Card>
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!uploadedFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor={`file-upload-${label}`} className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">{label}</span>
                <span className="mt-1 block text-sm text-gray-500">Upload PDF, DOCX, DOC, or TXT files (max 10MB)</span>
              </label>
              <input
                id={`file-upload-${label}`}
                type="file"
                className="sr-only"
                accept={accept}
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={uploading}
              onClick={() => document.getElementById(`file-upload-${label}`)?.click()}
            >
              {uploading ? "Uploading..." : "Choose File"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center">
              <File className="h-5 w-5 text-green-600" />
              <span className="ml-2 text-sm font-medium text-green-900">{uploadedFile}</span>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={removeFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
