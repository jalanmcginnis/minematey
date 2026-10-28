'use client';

import { useEffect } from 'react';
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
    equipmentUnit: z.string().min(1, 'Equipment Unit / ID is required.'),
    hourMeterReading: z.coerce.number().min(0, 'Hour meter reading must be 0 or greater.'),
    inspectorName: z.string().min(1, 'Inspector name is required.'),
    examDate: z.date(),
    safetyStatus: z.enum(['Safe to Operate', 'Defect Found - Red Tagged'], {
        required_error: "You need to select a safety status."
    }),
    defectDetails: z.string().min(1, 'Please provide defect details or state "None".'),
    correctiveAction: z.string().optional(),
});

interface EquipmentExamFormProps {
    selectedMineId?: string;
}

export function EquipmentExamForm({ selectedMineId = "13-00123" }: EquipmentExamFormProps) {
    const { toast } = useToast();
    const { user, profile } = useAuth();
    const firestore = useFirestore();

    const resolvedExaminerName = profile?.fullName || user?.email || "Examiner";

    const form = useForm<z.infer<typeof examSchema>>({
        resolver: zodResolver(examSchema),
        defaultValues: {
            equipmentUnit: '',
            hourMeterReading: 0,
            inspectorName: resolvedExaminerName,
            examDate: new Date(),
            safetyStatus: 'Safe to Operate',
            defectDetails: 'None',
            correctiveAction: '',
        },
    });

    useEffect(() => {
        const currentInspector = form.getValues('inspectorName');
        if (!currentInspector || currentInspector === 'Examiner') {
            form.setValue('inspectorName', resolvedExaminerName);
        }
    }, [resolvedExaminerName, form]);

    async function onSubmit(data: z.infer<typeof examSchema>) {
        if (!firestore) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Database is not available.",
            });
            return;
        }

        // Target root "equipment_exams" collection for multi-tenant storage
        const equipmentExamsCollection = collection(firestore, 'equipment_exams');
        const examinerNameValue = data.inspectorName.trim() || profile?.fullName || user?.email || "Examiner";

        const isDefect =
            data.safetyStatus === 'Defect Found - Red Tagged' ||
            (data.defectDetails.trim() !== '' &&
                data.defectDetails.trim().toLowerCase() !== 'none');

        // Multi-tenancy and equipment exam payload
        const docData = {
            // Equipment form fields
            equipmentUnit: data.equipmentUnit,
            equipmentId: data.equipmentUnit,
            equipmentNumber: data.equipmentUnit,
            hourMeterReading: Number(data.hourMeterReading),
            operatingHours: Number(data.hourMeterReading),
            inspectorName: examinerNameValue,
            inspector: examinerNameValue,
            operator: examinerNameValue,
            date: data.examDate instanceof Date ? data.examDate.toISOString() : new Date(data.examDate).toISOString(),
            examDate: data.examDate,
            safetyStatus: data.safetyStatus,
            status: isDefect ? 'Open' : 'Safe to Operate',
            defectDetails: data.defectDetails,
            defectsFound: data.defectDetails,
            correctiveAction: data.correctiveAction || '',
            correctiveActionNotes: data.correctiveAction || '',
            correctedByName: '',
            correctedAt: '',

            // Multi-tenancy & authenticated user identifiers
            companyId: profile?.companyId || "comp_test_001",
            mshaMineId: selectedMineId,
            userId: user?.uid || "guest_user",
            createdAt: new Date().toISOString(),
        };

        try {
            await addDoc(equipmentExamsCollection, docData);
            toast({
                title: "Exam Submitted",
                description: `Equipment exam for ${data.equipmentUnit} has been recorded.`,
            });
            form.reset({
                equipmentUnit: '',
                hourMeterReading: 0,
                inspectorName: profile?.fullName || user?.email || "Examiner",
                examDate: new Date(),
                safetyStatus: 'Safe to Operate',
                defectDetails: 'None',
                correctiveAction: '',
            });
        } catch (error: any) {
            console.error("Error creating equipment exam:", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: equipmentExamsCollection.path,
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
                                name="equipmentUnit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Equipment Unit / ID</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Loader #2" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="hourMeterReading"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hour Meter Reading</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="e.g., 1250"
                                                {...field}
                                                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="inspectorName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Inspector Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder={resolvedExaminerName} {...field} />
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
                                        <FormLabel>Date</FormLabel>
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
                        </div>

                        <FormField
                            control={form.control}
                            name="safetyStatus"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Safety Status</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex flex-wrap gap-6"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="Safe to Operate" />
                                                </FormControl>
                                                <FormLabel className="font-normal">Safe to Operate</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="Defect Found - Red Tagged" />
                                                </FormControl>
                                                <FormLabel className="font-normal text-destructive">
                                                    Defect Found - Red Tagged
                                                </FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="defectDetails"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Defect Details / Findings</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={4}
                                            placeholder="Describe any defects found or state 'None'..."
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
                                    <FormLabel>Corrective Action</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            rows={3}
                                            placeholder="Describe corrective actions taken (if any)..."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit">Submit Equipment Exam</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
