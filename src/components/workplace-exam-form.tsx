'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const examSchema = z.object({
    area: z.string().min(1, 'Area of inspection is required.'),
    inspector: z.string().min(1, 'Inspector name is required.'),
    examDate: z.date(),
    findings: z.string().optional(),
    correctiveAction: z.string().optional(),
    status: z.enum(['safe', 'at_risk', 'unsafe'], {
        required_error: "You need to select a status."
    }),
}).superRefine((data, ctx) => {
    if (data.status !== 'safe' && (!data.findings || !data.findings.trim())) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['findings'],
            message: 'Please describe the hazard or condition found.',
        });
    }
});

interface WorkplaceExamFormProps {
    selectedMineId?: string;
}

export function WorkplaceExamForm({ selectedMineId = "13-00123" }: WorkplaceExamFormProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user, profile } = useAuth();

    const [examinerState, setExaminerState] = useState<string>(profile?.fullName || "");
    const examinerName = user?.isAnonymous
        ? (profile?.fullName || "Guest Supervisor")
        : (profile?.fullName || user?.displayName || "Jed McGinnis");

    const form = useForm<z.infer<typeof examSchema>>({
        resolver: zodResolver(examSchema),
        defaultValues: {
            inspector: profile?.fullName || "",
            examDate: new Date(),
            findings: '',
            area: '',
            status: 'safe',
            correctiveAction: ''
        },
    });

    const currentStatus = form.watch('status');

    useEffect(() => {
        if (profile?.fullName) {
            setExaminerState(profile.fullName);
            form.setValue('inspector', profile.fullName);
        } else if (user?.isAnonymous) {
            setExaminerState("Guest Supervisor");
            form.setValue('inspector', "Guest Supervisor");
        } else if (user) {
            const fallbackName = profile?.fullName || user?.displayName || "Jed McGinnis";
            setExaminerState(fallbackName);
            form.setValue('inspector', fallbackName);
        }
    }, [profile, user, form]);

    async function onSubmit(data: z.infer<typeof examSchema>) {
        if (data.status !== 'safe' && (!data.findings || !data.findings.trim())) {
            form.setError('findings', {
                type: 'manual',
                message: 'Please describe the hazard or condition found.',
            });
            toast({
                variant: "destructive",
                title: "Hazard Description Required",
                description: "Please describe the hazard or condition found.",
            });
            return;
        }

        if (!firestore) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Database is not available.",
            });
            return;
        }

        // Target the root "workplace_exams" collection for multi-tenant storage
        const workplaceExamsCollection = collection(firestore, 'workplace_exams');
        const resolvedExaminer = user?.isAnonymous
            ? (profile?.fullName || "Guest Supervisor")
            : (profile?.fullName || user?.displayName || "Jed McGinnis");
        const examinerNameValue = data.inspector.trim() || examinerState.trim() || resolvedExaminer;
        const resolvedFindings = data.findings?.trim()
            ? data.findings.trim()
            : (data.status === 'safe' ? "No safety hazards or adverse conditions observed" : "");

        const isDefect = data.status !== 'safe';

        // Build the standalone text workplace exam payload (decoupled from photo/PDF uploads)
        const docData = {
            // Existing inspection form fields preserved
            area: data.area,
            inspector: examinerNameValue,
            inspectorName: examinerNameValue,
            date: data.examDate instanceof Date ? data.examDate.toISOString() : new Date(data.examDate).toISOString(),
            examDate: data.examDate,
            status: isDefect ? 'Open' : 'safe',
            safetyStatus: data.status,
            findings: resolvedFindings,
            correctiveAction: data.correctiveAction || '',
            correctiveActionNotes: data.correctiveAction || '',
            correctedByName: '',
            correctedAt: '',

            // Multi-tenancy & authenticated user identifier fields
            companyId: profile?.companyId || "comp_test_001",
            mshaMineId: selectedMineId,
            userId: user?.uid || "guest_user",
            createdAt: new Date().toISOString(),
        };

        try {
            await addDoc(workplaceExamsCollection, docData);
            toast({
                title: "Exam Submitted",
                description: `Workplace exam for ${data.area} has been recorded.`,
            });
            setExaminerState(resolvedExaminer);
            form.reset({
                inspector: resolvedExaminer,
                examDate: new Date(),
                findings: '',
                area: '',
                status: 'safe',
                correctiveAction: ''
            });
        } catch (error: any) {
            console.error("Error creating workplace exam:", error);
            // Emit a detailed, contextual error for better debugging
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: workplaceExamsCollection.path,
                operation: 'create',
                requestResourceData: docData,
            }));
        }
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            <FormField
                                control={form.control}
                                name="area"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Area of Inspection</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Underground Haulage" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="inspector"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Inspector Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={examinerName}
                                                {...field}
                                                onChange={(e) => {
                                                    field.onChange(e);
                                                    setExaminerState(e.target.value);
                                                }}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="examDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date of Exam</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date > new Date() || date < new Date("1900-01-01")
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Safety Status</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    if (value === 'safe') {
                                                        form.clearErrors('findings');
                                                    }
                                                }}
                                                value={field.value}
                                                defaultValue={field.value}
                                                className="flex space-x-4"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="safe" /></FormControl>
                                                    <FormLabel className="font-normal">Safe</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="at_risk" /></FormControl>
                                                    <FormLabel className="font-normal">At Risk</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl><RadioGroupItem value="unsafe" /></FormControl>
                                                    <FormLabel className="font-normal">Unsafe</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="findings"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        {currentStatus === 'safe'
                                            ? 'Findings / Notes (Optional)'
                                            : 'Hazard Description / Defect Details *'}
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={5}
                                            required={currentStatus !== 'safe'}
                                            placeholder={
                                                currentStatus === 'safe'
                                                    ? "Optional notes or observations (defaults to 'No safety hazards or adverse conditions observed' if left blank)..."
                                                    : "Please describe the hazard or condition found..."
                                            }
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="correctiveAction"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Corrective Action Taken (if any)</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder="Describe immediate actions taken to mitigate risks..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit">Submit Workplace Exam</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
