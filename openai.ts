import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum,
} from "openai";

const OPENAI_CONFIG = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const GPT = async (
  prompt: string,
  n = 1,
  temperature = 0.5,
  max_tokens = 100,
  stop: null | string = null
) => {
  // initialize Open AI API
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(config);

  const request = {
    model: "text-davinci-003",
    prompt,
    temperature,
    n,
    max_tokens,
    stop,
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

export const ListGPT = async (prompt: string, length: number) => {
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(config);

  const request = {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content:
          "Respond with a Javascript array literal with the given length in parentheses.",
      },
      {
        role: ChatCompletionRequestMessageRoleEnum.User,
        content: "types of animals (length: 5)",
      },
      {
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
        content: '["dog", "cat", "frog", "horse", "deer"]',
      },
      // {
      //   role: ChatCompletionRequestMessageRoleEnum.User,
      //   content: `synonyms of "happy" (length: 1)`,
      // },
      // {
      //   role: ChatCompletionRequestMessageRoleEnum.Assistant,
      //   content: '["joyful"]',
      // },
      {
        role: ChatCompletionRequestMessageRoleEnum.User,
        content: `${prompt} (length: ${length})`,
      },
    ],
  };

  let completion;
  try {
    completion = await openai.createChatCompletion(request);
  } catch (err) {
    console.error(err);
    throw "Chat GPT failed to complete the request";
  }

  let response: string[] = [];
  const message = completion.data.choices[0].message?.content;
  if (message) {
    try {
      response = JSON.parse(message);
    } catch (err) {
      console.error(err);
      throw `Chat GPT failed to generate a proper list.\n${message}`;
    }
  }

  return response;
};
