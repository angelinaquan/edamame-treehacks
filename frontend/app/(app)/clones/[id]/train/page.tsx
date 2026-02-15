"use client";

import { useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Slack, Upload, User, Tag, CheckCircle2 } from "lucide-react";
import { PersonalityForm } from "@/components/clone-builder/PersonalityForm";
import { DocumentUpload } from "@/components/clone-builder/DocumentUpload";

const steps = [
  { id: "slack", label: "Connect Slack", icon: Slack },
  { id: "docs", label: "Upload Docs", icon: Upload },
  { id: "personality", label: "Personality", icon: User },
  { id: "tags", label: "Expertise Tags", icon: Tag },
];

export default function TrainClonePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleFinish = () => {
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 size={32} className="text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Clone Training Complete!
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Your clone is now active and ready to answer questions on your behalf.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href={`/chat?clone=${id}`}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Chat with Clone
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <Link
        href={`/clones/${id}`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ArrowLeft size={14} />
        Back to Clone
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Train Your Clone
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Set up your digital twin by connecting data sources and defining personality.
      </p>

      <div className="mt-8 flex items-center gap-2">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              onClick={() => setCurrentStep(i)}
              className={`flex flex-1 items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium transition-all ${
                i === currentStep
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-950/30 dark:text-blue-400"
                  : i < currentStep
                    ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400"
                    : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:block">{step.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Connect Slack
            </h2>
            <p className="text-sm text-zinc-500">
              Connect your Slack workspace to capture how you communicate — your
              tone, vocabulary, and how you explain things.
            </p>
            <a
              href="/api/slack/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-[#4A154B] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3a1039]"
            >
              <Slack size={16} />
              Connect Slack
            </a>
            <button
              onClick={() => setCurrentStep(1)}
              className="ml-3 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Skip for now
            </button>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Upload Documents
            </h2>
            <p className="text-sm text-zinc-500">
              Upload meeting notes, design docs, READMEs, or any documents that
              represent your expertise.
            </p>
            <DocumentUpload cloneId={id} />
            <button
              onClick={() => setCurrentStep(2)}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next: Personality
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Set Personality
            </h2>
            <p className="text-sm text-zinc-500">
              Define how your clone communicates. This shapes the system prompt
              and affects how your clone talks.
            </p>
            <PersonalityForm
              onSave={() => {
                setCurrentStep(3);
              }}
            />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Review & Activate
            </h2>
            <p className="text-sm text-zinc-500">
              Your clone is ready to go live. Once activated, teammates can chat
              with your clone to access your knowledge.
            </p>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Data sources connected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Personality configured
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span className="text-zinc-700 dark:text-zinc-300">
                    Ready to activate
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleFinish}
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Activate Clone
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
