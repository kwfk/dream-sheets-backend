import { Configuration, OpenAIApi } from "openai";

export const GPT = async (prompt: string, n = 1, temperature = 0.5) => {
  // initialize Open AI API
  const openaiConfig = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(openaiConfig);

  const request = {
    model: "text-davinci-003",
    prompt,
    temperature,
    n,
  };

  let response = "";
  try {
    const completion = await openai.createCompletion(request);
    response = completion.data.choices.map((c) => c.text).toString();
  } catch (err) {
    console.error(err);
    throw err;
  }

  return response;
};
