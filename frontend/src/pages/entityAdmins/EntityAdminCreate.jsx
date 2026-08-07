import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useCreateEntityAdmin } from '@/hooks/useEntityAdmins';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/common/PageHeader';

const entityAdminSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const EntityAdminCreate = () => {
  const { error: showError } = useNotification();
  const [showPassword, setShowPassword] = useState(false);
  const [created, setCreated] = useState(null);

  const createMutation = useCreateEntityAdmin();

  const form = useForm({
    resolver: zodResolver(entityAdminSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values) => {
    createMutation.mutate(values, {
      onSuccess: (res) => {
        setCreated(res?.data ?? null);
        form.reset({ email: '', password: '' });
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Create Entity Admin"
        description="Provision a new Entity Admin — they'll create their own Entities after logging in"
      />

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">New Entity Admin</CardTitle>
        </CardHeader>
        <CardContent>
          {created && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md border border-green-200 bg-green-50 px-3 py-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Entity Admin created successfully.</p>
                <p className="mt-0.5 text-xs text-green-700">
                  {created.email} (ID: {created.id})
                </p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form id="entity-admin-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] text-muted-foreground font-medium">
                      <span className="text-destructive mr-0.5">*</span> Email
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="entity.admin@example.com" className="h-8 text-sm border-gray-200" {...field} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] text-muted-foreground font-medium">
                      <span className="text-destructive mr-0.5">*</span> Password
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          autoComplete="new-password"
                          className="h-8 text-sm border-gray-200 pr-9"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />

              <Button type="submit" form="entity-admin-form" disabled={createMutation.isPending} size="sm" className="mt-1 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                <UserPlus className="mr-2 h-3.5 w-3.5" />
                {createMutation.isPending ? 'Creating...' : 'Create Entity Admin'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EntityAdminCreate;
