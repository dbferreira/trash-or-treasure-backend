import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const pricingInputSchema = z.object({
    images: z.array(
        z.object({
            url: z.string().describe('Image URL or base64 data URI'),
            mimeType: z.string().describe('Image MIME type, e.g. image/jpeg'),
        })
    ).min(1).max(10),
    description: z.string().optional().describe('Optional user-provided notes about the item'),
});

const pricingResultSchema = z.object({
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
});

const identifyAndPrice = createStep({
    id: 'identify-and-price',
    description: 'Identifies an item from images and estimates its resale value',
    inputSchema: pricingInputSchema,
    outputSchema: pricingResultSchema,
    execute: async ({ inputData, mastra }) => {
        const agent = mastra?.getAgent('pricingAgent');
        if (!agent) {
            throw new Error('Pricing agent not found');
        }

        // All images first, followed by the instructions
        const content = [
            ...inputData.images.map((image) => ({
                type: 'image' as const,
                image: image.url,
                mimeType: image.mimeType,
            })),
            {
                type: 'text' as const,
                text: `These images show different angles/views of the SAME item.
                ${inputData.description ? `User description: ${inputData.description}` : ''}

                Please analyze ALL images to:
                1. Identify the item (brand, model, condition)
                2. Assess condition from all visible angles
                3. Estimate market value in Ottawa, Ontario
                4. Provide price range in CAD and confidence percentage

                Return response in the specified format.`,
            },
        ];

        const response = await agent.generate([{ role: 'user', content }], {
            output: pricingResultSchema,
        });

        if (!response.object) {
            throw new Error('Agent failed to generate structured output');
        }

        return response.object;
    },
});

const pricingWorkflow = createWorkflow({
    id: 'pricing-workflow',
    inputSchema: pricingInputSchema,
    outputSchema: pricingResultSchema,
})
    .then(identifyAndPrice)
    .commit();

export { pricingWorkflow };
