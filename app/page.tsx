import { InterviewSetup } from "@/components/interview-setup"

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🌳 Treehire</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            AI-powered interview management platform. Upload resumes and job requirements to generate intelligent
            interview questions, record live transcripts, and get comprehensive candidate analysis.
          </p>
        </div>
        <InterviewSetup />
      </div>
    </div>
  )
}
