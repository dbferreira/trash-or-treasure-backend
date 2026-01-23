import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const identifyAndPrice = createStep({
    id: 'identify-and-price',
    description: 'Identifies an item from images and estimates its resale value',
    inputSchema: z.object({
        images: z.array(
            z.object({
                url: z.string(),
                mimeType: z.string()
            })
        ).min(1).max(10),
        description: z.string().optional()
    }),
    outputSchema: z.object({
        price: z.object({
            low: z.string(),
            high: z.string(),
        }),
        confidence: z.number(),
        sources: z.array(
            z.object({
                url: z.string(),
                type: z.string(),
            })
        ),
        item: z.object({
            name: z.string(),
            description: z.string(),
        }),
    }),
    execute: async ({ inputData, mastra, getInitData }) => {
        const agent = mastra?.getAgent('pricingAgent');
        if (!agent) {
            throw new Error('Pricing agent not found');
        }

        const data = inputData || getInitData?.();
        console.log({inputData, data});

        // Build content array with all images
        const content = [];

        // Add all images first
        for (const image of data.images) {
            content.push({
                type: "image",
                image: image.url,
                mimeType: image.mimeType
            });
        }

        // Add the prompt text
        content.push({
            type: "text",
            text: `These images show different angles/views of the SAME item. 
                ${data.description ? `User description: ${data.description}` : ''}
                
                Please analyze ALL images to:
                1. Identify the item (brand, model, condition)
                2. Assess condition from all visible angles
                3. Estimate market value in Ottawa, Ontario
                4. Provide price range in CAD and confidence percentage
                
                Return response in the specified format.`
        });

        const prompt = [
            {
                role: 'user',
                content,
            },
        ];

        const response = await agent.generate(prompt as any, {
            output: z.object({
                price: z.object({
                    low: z.string(),
                    high: z.string(),
                }),
                confidence: z.number(),
                sources: z.array(
                    z.object({
                        url: z.string(),
                        type: z.string(),
                    })
                ),
                item: z.object({
                    name: z.string(),
                    description: z.string(),
                }),
            }),
        });

        console.log("Agent response text:", response.text);
        console.log("Agent response object:", JSON.stringify(response.object, null, 2));

        if (!response.object) {
            throw new Error("Agent failed to generate structured output");
        }

        return response.object;
    },
});

const pricingWorkflow = createWorkflow({
    id: 'pricing-workflow',
    inputSchema: z.object({
        images: z.array(
            z.object({
                url: z.string(),
                mimeType: z.string()
            })
        ).min(1).max(10),
        description: z.string().optional()
    }),
    outputSchema: z.object({
        price: z.object({
            low: z.string().describe('Low pricing estimate'),
            high: z.string().describe('High pricing estimate'),
        }),
        confidence: z.number().describe('Confidence in price and item identification from 0 to 100'),
        sources: z.array(
            z.object({
                url: z.string().describe('Source URL'),
                type: z.string().describe('Source type label such as Kijiji or Facebook Marketplace'),
            })
        ).describe('Sources used to gather pricing estimates'),
        item: z.object({
            name: z.string().describe('The name of the identified item'),
            description: z.string().describe('The description of the identified item'),
        }),
    }),
})
    .then(identifyAndPrice)
    .commit();

export { pricingWorkflow };
