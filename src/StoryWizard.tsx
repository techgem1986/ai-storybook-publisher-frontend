import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { Card, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles, BookOpen, Palette, Download, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';

interface WizardProps {
  onComplete: (bookData: any) => void;
  onCancel: () => void;
}

interface Preset {
  name: string;
  title: string;
  description: string;
  ageGroup: string;
  writingStyle: string;
  illustrationStyle: string;
}

const PRESETS: Preset[] = [
  {
    name: 'magical-bedtime',
    title: 'Magical Bedtime Adventure',
    description: 'A gentle story about a child discovering magic in their bedroom before sleep.',
    ageGroup: '5-8 year old',
    writingStyle: 'bedtime story and calm',
    illustrationStyle: 'storybook watercolor'
  },
  {
    name: 'friendship-adventure',
    title: 'Friends on a Big Adventure',
    description: 'Two friends embark on an exciting journey through a magical forest.',
    ageGroup: '5-8 year old',
    writingStyle: 'adventurous and exciting',
    illustrationStyle: 'cartoon'
  },
  {
    name: 'animal-learning',
    title: 'Animal Friends Learn Together',
    description: 'Cute animals discover something new and share their knowledge.',
    ageGroup: '2-4 year old',
    writingStyle: 'educational and simple',
    illustrationStyle: 'digital flat'
  }
];

export default function StoryWizard({ onComplete, onCancel }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [ageGroup, setAgeGroup] = useState('5-8 year old');
  const [writingStyle, setWritingStyle] = useState('happy and magical');
  const [illustrationStyle, setIllustrationStyle] = useState('storybook watercolor');
  const [numberOfPages, setNumberOfPages] = useState(5);
  const [loading, setLoading] = useState(false);

  const steps = [
    { title: 'Choose Your Story', icon: Sparkles },
    { title: 'Customize Details', icon: BookOpen },
    { title: 'Pick Illustration Style', icon: Palette },
    { title: 'Generate & Download', icon: Download }
  ];

  const handlePresetSelect = (preset: Preset) => {
    setSelectedPreset(preset);
    setCustomTitle(preset.title);
    setCustomDescription(preset.description);
    setAgeGroup(preset.ageGroup);
    setWritingStyle(preset.writingStyle);
    setIllustrationStyle(preset.illustrationStyle);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation GenerateStoryDraft($title: String!, $description: String, $ageGroup: String, $writingStyle: String, $illustrationStyle: String, $numberOfPages: Int) {
              generateStoryDraft(title: $title, description: $description, ageGroup: $ageGroup, writingStyle: $writingStyle, illustrationStyle: $illustrationStyle, numberOfPages: $numberOfPages) {
                id
                title
                status
                pdfStatus
                lastStatus
                createdAt
              }
            }
          `,
          variables: {
            title: customTitle.trim(),
            description: customDescription.trim(),
            ageGroup,
            writingStyle,
            illustrationStyle,
            numberOfPages
          }
        })
      });

      const result = await response.json();
      if (result.data) {
        onComplete(result.data.generateStoryDraft);
      }
    } catch (error) {
      console.error('Error generating book:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-cyan-vibrant mb-4">Choose Your Story Type</h2>
              <p className="text-slate-300 mb-8">Pick a preset story idea or start with your own concept</p>
            </div>

            <div className="grid gap-4">
              {PRESETS.map((preset) => (
                <Card
                  key={preset.name}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:border-cyan-vibrant/50",
                    selectedPreset?.name === preset.name && "border-cyan-vibrant bg-cyan-vibrant/10"
                  )}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-cyan-vibrant/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-cyan-vibrant" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">{preset.title}</h3>
                        <p className="text-slate-300 mb-3">{preset.description}</p>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant="secondary">{preset.ageGroup}</Badge>
                          <Badge variant="secondary">{preset.writingStyle}</Badge>
                          <Badge variant="secondary">{preset.illustrationStyle}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:border-cyan-vibrant/50",
                  selectedPreset === null && "border-cyan-vibrant bg-cyan-vibrant/10"
                )}
                onClick={() => setSelectedPreset(null)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Custom Story</h3>
                      <p className="text-slate-300">Create your own unique story idea</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-cyan-vibrant mb-4">Customize Your Story</h2>
              <p className="text-slate-300 mb-8">Add your personal touch to make it special</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-bold text-slate-300">Story Title</label>
                <Input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. The Little Magic Dragon"
                  className="bg-slate-800/50 border-white/10 text-white"
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-slate-300">Story Description</label>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="What is the story about? Be as creative as you like!"
                  className="bg-slate-800/50 border-white/10 text-white min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-bold text-slate-300">Age Group</label>
                  <Select value={ageGroup} onValueChange={setAgeGroup}>
                    <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="2-4 year old">2-4 years</SelectItem>
                      <SelectItem value="5-8 year old">5-8 years</SelectItem>
                      <SelectItem value="9-12 year old">9-12 years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-bold text-slate-300">Number of Pages</label>
                  <Input
                    type="number"
                    min="3"
                    max="10"
                    value={numberOfPages}
                    onChange={(e) => setNumberOfPages(parseInt(e.target.value) || 5)}
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-cyan-vibrant mb-4">Choose Illustration Style</h2>
              <p className="text-slate-300 mb-8">Select how your storybook will look</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-bold text-slate-300">Writing Style</label>
                <Select value={writingStyle} onValueChange={setWritingStyle}>
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="happy and magical">Happy and Magical</SelectItem>
                    <SelectItem value="adventurous and exciting">Adventurous and Exciting</SelectItem>
                    <SelectItem value="educational and simple">Educational and Simple</SelectItem>
                    <SelectItem value="bedtime story and calm">Bedtime Story and Calm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-bold text-slate-300">Illustration Style</label>
                <Select value={illustrationStyle} onValueChange={setIllustrationStyle}>
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="storybook watercolor">Storybook Watercolor</SelectItem>
                    <SelectItem value="cartoon">Cartoon</SelectItem>
                    <SelectItem value="digital flat">Digital Flat</SelectItem>
                    <SelectItem value="paper-cut">Paper-Cut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-lg p-6">
              <h3 className="font-bold text-lg mb-4 text-cyan-vibrant">Preview Your Choices</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-400">Title:</span> {customTitle || 'Untitled'}</p>
                <p><span className="text-slate-400">Age Group:</span> {ageGroup}</p>
                <p><span className="text-slate-400">Writing Style:</span> {writingStyle}</p>
                <p><span className="text-slate-400">Illustration Style:</span> {illustrationStyle}</p>
                <p><span className="text-slate-400">Pages:</span> {numberOfPages}</p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-cyan-vibrant mb-4">Ready to Create Magic!</h2>
              <p className="text-slate-300 mb-8">Your personalized storybook is about to be generated</p>
            </div>

            <Card className="bg-slate-800/50 border-cyan-vibrant/30">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-cyan-vibrant/20 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-cyan-vibrant" />
                  </div>
                  <h3 className="text-xl font-bold">"{customTitle}"</h3>
                  <p className="text-slate-300">{customDescription}</p>
                  <div className="flex justify-center gap-4 flex-wrap">
                    <Badge>{ageGroup}</Badge>
                    <Badge>{writingStyle}</Badge>
                    <Badge>{illustrationStyle}</Badge>
                    <Badge>{numberOfPages} pages</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-slate-400">
              <p>✨ AI will generate story text, illustrations, and a beautiful PDF</p>
              <p>📖 Perfect for bedtime stories, gifts, and preschool learning</p>
              <p>🎨 Professionally formatted, illustrated kids storybooks</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <div key={index} className="flex flex-col items-center">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors",
                  isCompleted && "bg-green-500 text-white",
                  isActive && "bg-cyan-vibrant text-slate-950",
                  !isCompleted && !isActive && "bg-slate-700 text-slate-400"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={cn(
                  "text-xs text-center max-w-20",
                  isActive && "text-cyan-vibrant font-bold",
                  !isActive && "text-slate-400"
                )}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
        <Progress value={(currentStep + 1) / steps.length * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="bg-slate-900/80 border-white/10 text-white">
          <CardContent className="p-8">
            {renderStepContent()}
          </CardContent>
        </Card>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          onClick={currentStep === 0 ? onCancel : handleBack}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            disabled={currentStep === 0 && !selectedPreset && !customTitle.trim()}
            className="bg-cyan-vibrant text-slate-950 hover:bg-cyan-vibrant/90 flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={loading || !customTitle.trim()}
            className="bg-cyan-vibrant text-slate-950 hover:bg-cyan-vibrant/90 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Storybook
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}