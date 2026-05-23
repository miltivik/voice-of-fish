import { zodResolver } from "@hookform/resolvers/zod";
import type { AppConfig } from "@voice-of-fish/shared";
import { setupSchema } from "@voice-of-fish/shared/schemas";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SetupValues = z.infer<typeof setupSchema>;

export function SetupPanel({
  onSave,
}: {
  onSave: (config: AppConfig) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      mode: "simple",
      binaryPath: "",
      modelsPath: "",
      outputsPath: "",
    },
  });

  const save = (values: SetupValues) =>
    onSave({
      ...values,
      defaultModelId: "s2-q6",
      defaultAudioFormat: "wav",
      cpuThreads: 8,
      gpuEnabled: true,
      advancedArgs: {},
    });

  return (
    <form className="space-y-4" onSubmit={handleSubmit(save)} noValidate>
      <h2 className="text-xl font-semibold">Voice of Fish Setup</h2>
      <div className="space-y-1">
        <Input
          placeholder="e.g. C:\\s2\\s2.exe"
          aria-label="s2.cpp binary"
          {...register("binaryPath")}
        />
        {errors.binaryPath && (
          <p role="alert" className="text-sm text-danger">
            {errors.binaryPath.message}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Input
          placeholder="e.g. C:\\voice-of-fish\\models"
          aria-label="Models folder"
          {...register("modelsPath")}
        />
        {errors.modelsPath && (
          <p role="alert" className="text-sm text-danger">
            {errors.modelsPath.message}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Input
          placeholder="e.g. C:\\voice-of-fish\\outputs"
          aria-label="Outputs folder"
          {...register("outputsPath")}
        />
        {errors.outputsPath && (
          <p role="alert" className="text-sm text-danger">
            {errors.outputsPath.message}
          </p>
        )}
      </div>
      <Button type="submit">Save setup</Button>
    </form>
  );
}
