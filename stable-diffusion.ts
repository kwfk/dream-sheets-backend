import GenerationService from "./stabilityai-api-interfaces/gooseai/generation/generation_pb_service";
import Generation from "./stabilityai-api-interfaces/gooseai/generation/generation_pb";
import { grpc } from "@improbable-eng/grpc-web";
import { NodeHttpTransport } from "@improbable-eng/grpc-web-node-http-transport";

grpc.setDefaultTransport(NodeHttpTransport());

interface GeneratedImage {
  seed: number;
  base64Image: string;
}

export const generateImage = (prompt: string, seed: number) => {
  // Set up image parameters
  const imageParams = new Generation.ImageParameters();
  imageParams.setWidth(512);
  imageParams.setHeight(512);
  imageParams.addSeed(seed);
  imageParams.setSamples(1);
  imageParams.setSteps(50);

  // Use the `k-dpmpp-2` sampler
  const transformType = new Generation.TransformType();
  transformType.setDiffusion(Generation.DiffusionSampler.SAMPLER_K_DPMPP_2M);
  imageParams.setTransform(transformType);

  // Use Stable Diffusion 2.0
  const request = new Generation.Request();
  request.setEngineId("stable-diffusion-512-v2-1");
  request.setRequestedType(Generation.ArtifactType.ARTIFACT_IMAGE);
  request.setClassifier(new Generation.ClassifierParameters());

  // Use a CFG scale of `13`
  const samplerParams = new Generation.SamplerParameters();
  samplerParams.setCfgScale(13);

  const stepParams = new Generation.StepParameter();
  const scheduleParameters = new Generation.ScheduleParameters();

  // Set the schedule to `0`, this changes when doing an initial image generation
  stepParams.setScaledStep(0);
  stepParams.setSampler(samplerParams);
  stepParams.setSchedule(scheduleParameters);

  imageParams.addParameters(stepParams);
  request.setImage(imageParams);

  // Set our text prompt
  const promptText = new Generation.Prompt();
  promptText.setText(prompt);

  request.addPrompt(promptText);

  // Authenticate using your API key, don't commit your key to a public repository!
  const metadata = new grpc.Metadata();
  metadata.set("Authorization", "Bearer " + process.env.STABILITYAI_API_KEY);

  // Create a generation client
  const generationClient = new GenerationService.GenerationServiceClient(
    "https://grpc.stability.ai",
    {}
  );

  // Send the request using the `metadata` with our key from earlier
  const generation = generationClient.generate(request, metadata);

  return new Promise<GeneratedImage>((resolve, reject) => {
    // Set up a callback to handle data being returned
    generation.on("data", (data) => {
      data.getArtifactsList().forEach((artifact) => {
        // Oh no! We were filtered by the NSFW classifier!
        if (
          artifact.getType() === Generation.ArtifactType.ARTIFACT_TEXT &&
          artifact.getFinishReason() === Generation.FinishReason.FILTER
        ) {
          return console.error(
            "Your image was filtered by the NSFW classifier."
          );
        }

        // Make sure we have an image
        if (artifact.getType() !== Generation.ArtifactType.ARTIFACT_IMAGE)
          return;

        // You can convert the raw binary into a base64 string
        // const base64Image = btoa(
        //   new Uint8Array(artifact.getBinary()).reduce(
        //     (data, byte) => data + String.fromCodePoint(byte),
        //     ""
        //   )
        // );
        const base64Image = artifact.getBinary_asB64();

        // Here's how you get the seed back if you set it to `0` (random)
        const seed = artifact.getSeed();

        // We're done!
        resolve({ seed, base64Image });
      });
    });

    // Anything other than `status.code === 0` is an error
    generation.on("status", (status) => {
      if (status.code === 0) return;
      reject(
        "Your image could not be generated. You might not have enough credits."
      );
    });
  });
};
