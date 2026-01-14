import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { useProfileStore, UserProfile } from "@/utils/profile-store";
import { CheckCircle2, FileText, Briefcase, HeartPulse, GraduationCap, DollarSign, Search } from "lucide-react";

type TAPStepId = keyof NonNullable<UserProfile['tapProgress']>;

interface TAPStep {
  id: TAPStepId;
  label: string;
  icon: any;
}

export function TAPDashboard() {
  const { profile, updateProfile } = useProfileStore();
  const [loading, setLoading] = useState(false);

  const steps: TAPStep[] = [
    { id: 'preSeparationCounseling', label: 'Pre-Separation Counseling', icon: CheckCircle2 },
    { id: 'vaBenefitsBriefing', label: 'VA Benefits Briefing', icon: FileText },
    { id: 'financialPlanning', label: 'Financial Planning', icon: DollarSign },
    { id: 'medicalRecords', label: 'Medical Records Review', icon: HeartPulse },
    { id: 'employmentWorkshop', label: 'Employment Workshop', icon: Briefcase },
    { id: 'resume', label: 'Resume / CV Draft', icon: FileText },
    { id: 'dd214', label: 'DD-214 Review', icon: Search },
    { id: 'capstoneReview', label: 'Capstone Review', icon: GraduationCap },
  ];

  const completedCount = steps.filter(step => profile?.tapProgress?.[step.id]).length;
  const progress = (completedCount / steps.length) * 100;

  const toggleStep = async (id: TAPStepId, checked: boolean) => {
    if (!profile) return;
    setLoading(true);
    try {
        await updateProfile({
            tapProgress: {
                ...profile.tapProgress,
                [id]: checked
            }
        });
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
            <CardTitle className="flex justify-between items-center text-white">
                <span className="flex items-center gap-2">
                    <GraduationCap className="w-6 h-6 text-purple-400" />
                    Digital TAP Dashboard
                </span>
                <span className="text-sm font-normal text-gray-400">{Math.round(progress)}% Ready</span>
            </CardTitle>
            <CardDescription>Track your Transition Assistance Program milestones.</CardDescription>
        </CardHeader>
        <CardContent>
            <Progress value={progress} className="h-2 mb-6 bg-gray-800" indicatorClassName="bg-purple-500" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {steps.map((step) => (
                    <div key={step.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors border border-gray-800/50">
                        <Checkbox 
                            id={step.id} 
                            checked={profile?.tapProgress?.[step.id] || false}
                            onCheckedChange={(checked) => toggleStep(step.id, checked === true)}
                            disabled={loading}
                            className="border-gray-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600 mt-0.5"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor={step.id}
                                className="text-sm font-medium leading-none text-gray-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center cursor-pointer"
                            >
                                <step.icon className="w-3.5 h-3.5 mr-2 text-gray-500" />
                                {step.label}
                            </label>
                        </div>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
  );
}
