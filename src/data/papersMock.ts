import type { PaperItem } from '@/types/paper'

const baseAvatar = (idx: number) => `https://i.pravatar.cc/100?img=${(idx % 70) + 1}`

// 导出 raw 数组供 API 使用
export const raw = [
  {
    id: 1,
    title: 'Attention Is All You Need',
    authors: 'Vaswani et al.',
    keywords: ['Transformer', 'NLP', 'Deep Learning', 'Attention'],
    abstract:
      'We propose a new network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
    pdfUrl: 'https://arxiv.org/pdf/1706.03762.pdf',
    venue: 'NeurIPS 2017',
    submittedDate: '2017-06-12',
    deadline: '2026-04-01'
  },
  {
    id: 2,
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: 'Devlin et al.',
    keywords: ['BERT', 'NLP', 'Pre-training', 'Transformers'],
    abstract:
      'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers.',
    pdfUrl: 'https://arxiv.org/pdf/1810.04805.pdf',
    venue: 'NAACL 2019',
    submittedDate: '2018-10-11',
    deadline: '2026-03-25'
  },
  {
    id: 3,
    title: 'Language Models are Few-Shot Learners',
    authors: 'Brown et al.',
    keywords: ['GPT-3', 'NLP', 'Few-Shot Learning', 'Large Language Models'],
    abstract:
      'We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance, without any gradient updates.',
    pdfUrl: 'https://arxiv.org/pdf/2005.14165.pdf',
    venue: 'NeurIPS 2020',
    submittedDate: '2020-05-28',
    deadline: '2026-04-10'
  },
  {
    id: 4,
    title: 'EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks',
    authors: 'Tan & Le',
    keywords: ['EfficientNet', 'Computer Vision', 'Model Scaling', 'CNNs'],
    abstract:
      'We propose a compound scaling method that uniformly scales depth, width, and resolution in a principled way.',
    pdfUrl: 'https://arxiv.org/pdf/1905.11946.pdf',
    venue: 'ICML 2019',
    submittedDate: '2019-05-28',
    deadline: '2026-03-30'
  },
  {
    id: 5,
    title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
    authors: 'Dosovitskiy et al.',
    keywords: ['ViT', 'Vision Transformer', 'Computer Vision', 'Transformers'],
    abstract:
      'We show that Vision Transformers outperform previous state-of-the-art models on image classification while requiring fewer computational resources.',
    pdfUrl: 'https://arxiv.org/pdf/2010.11929.pdf',
    venue: 'ICLR 2021',
    submittedDate: '2020-10-22',
    deadline: '2026-04-05'
  },
  {
    id: 6,
    title: 'Learning Transferable Visual Models From Natural Language Supervision',
    authors: 'Radford et al.',
    keywords: ['CLIP', 'Computer Vision', 'Multimodal', 'Zero-Shot'],
    abstract:
      'We demonstrate that simple pre-training task of predicting which caption goes with which image is an efficient and scalable way to learn image representations.',
    pdfUrl: 'https://arxiv.org/pdf/2103.00020.pdf',
    venue: 'ICML 2021',
    submittedDate: '2021-02-26',
    deadline: '2026-04-15'
  },
  {
    id: 7,
    title: 'Diffusion Models Beat GANs on Image Synthesis',
    authors: 'Dhariwal & Nichol',
    keywords: ['Diffusion Models', 'GANs', 'Image Generation', 'Computer Vision'],
    abstract:
      'We show that diffusion models can achieve image generation quality superior to state-of-the-art GANs while maintaining better diversity and coverage.',
    pdfUrl: 'https://arxiv.org/pdf/2105.05233.pdf',
    venue: 'NeurIPS 2021',
    submittedDate: '2021-05-11',
    deadline: '2026-03-28'
  },
  {
    id: 8,
    title: 'LLaMA: Open and Efficient Foundation Language Models',
    authors: 'Touvron et al.',
    keywords: ['LLaMA', 'Large Language Models', 'NLP', 'Open Source'],
    abstract:
      'We introduce LLaMA, a collection of foundation language models ranging from 7B to 65B parameters, trained on publicly available datasets.',
    pdfUrl: 'https://arxiv.org/pdf/2302.13971.pdf',
    venue: 'ICLR 2024',
    submittedDate: '2023-02-24',
    deadline: '2026-04-20'
  },
  {
    id: 9,
    title: 'Training language models to follow instructions with human feedback',
    authors: 'Ouyang et al.',
    keywords: ['InstructGPT', 'RLHF', 'NLP', 'Alignment'],
    abstract:
      'We show that fine-tuning language models with human feedback enables much better instruction following behavior.',
    pdfUrl: 'https://arxiv.org/pdf/2203.02155.pdf',
    venue: 'NeurIPS 2022',
    submittedDate: '2022-01-27',
    deadline: '2026-04-08'
  },
  {
    id: 10,
    title: 'PaLM-E: An Embodied Multimodal Language Model',
    authors: 'Driess et al.',
    keywords: ['PaLM-E', 'Multimodal', 'Robotics', 'Embodied AI'],
    abstract:
      'We present PaLM-E, a generalist language model for robotics that incorporates real-world continuous sensor modalities into language models.',
    pdfUrl: 'https://arxiv.org/pdf/2303.03378.pdf',
    venue: 'ICRA 2023',
    submittedDate: '2023-03-06',
    deadline: '2026-04-12'
  },
  {
    id: 11,
    title: 'Segment Anything',
    authors: 'Kirillov et al.',
    keywords: ['SAM', 'Computer Vision', 'Segmentation', 'Foundation Model'],
    abstract:
      'We introduce the Segment Anything Model (SAM), a promptable segmentation system with zero-shot generalization to diverse image domains.',
    pdfUrl: 'https://arxiv.org/pdf/2304.02643.pdf',
    venue: 'ICCV 2023',
    submittedDate: '2023-04-05',
    deadline: '2026-03-22'
  },
  {
    id: 12,
    title: 'LoRA: Low-Rank Adaptation of Large Language Models',
    authors: 'Hu et al.',
    keywords: ['LoRA', 'NLP', 'Fine-tuning', 'Efficient Training'],
    abstract:
      'We propose Low-Rank Adaptation (LoRA), a parameter-efficient fine-tuning method that frozen model weights and injects trainable rank decomposition matrices.',
    pdfUrl: 'https://arxiv.org/pdf/2106.09685.pdf',
    venue: 'ICLR 2022',
    submittedDate: '2021-06-17',
    deadline: '2026-04-18'
  },
  {
    id: 13,
    title: 'Self-Instruct: Aligning Language Model with Self Generated Instructions',
    authors: 'Wang et al.',
    keywords: ['Self-Instruct', 'NLP', 'Instruction Tuning', 'LLM'],
    abstract:
      'We introduce Self-Instruct, a framework that leverages language model itself to generate instruction data for tuning.',
    pdfUrl: 'https://arxiv.org/pdf/2212.10560.pdf',
    venue: 'ACL 2023',
    submittedDate: '2022-12-21',
    deadline: '2026-04-25'
  },
  {
    id: 14,
    title: 'Chain-of-Thought Prompting Elicits Reasoning in Large Language Models',
    authors: 'Wei et al.',
    keywords: ['CoT', 'NLP', 'Reasoning', 'Prompt Engineering'],
    abstract:
      'We demonstrate that chain-of-thought prompting improves the ability of large language models to perform complex reasoning tasks.',
    pdfUrl: 'https://arxiv.org/pdf/2201.11903.pdf',
    venue: 'NeurIPS 2022',
    submittedDate: '2022-01-27',
    deadline: '2026-04-02'
  },
  {
    id: 15,
    title: 'GPT-4 Technical Report',
    authors: 'OpenAI',
    keywords: ['GPT-4', 'Large Language Models', 'Multimodal', 'NLP'],
    abstract:
      'We report the development of GPT-4, a large-scale, multimodal model capable of accepting image and text inputs and producing text outputs.',
    pdfUrl: 'https://arxiv.org/pdf/2303.08774.pdf',
    venue: 'arXiv 2023',
    submittedDate: '2023-03-15',
    deadline: '2026-05-01'
  },
  {
    id: 16,
    title: 'Stable Diffusion: High-Resolution Image Synthesis with Latent Diffusion Models',
    authors: 'Rombach et al.',
    keywords: ['Stable Diffusion', 'Diffusion Models', 'Image Generation', 'Computer Vision'],
    abstract:
      'We propose Latent Diffusion Models (LDM) that achieve new state-of-the-art results for image synthesis while significantly reducing computational requirements.',
    pdfUrl: 'https://arxiv.org/pdf/2112.10752.pdf',
    venue: 'CVPR 2022',
    submittedDate: '2021-12-20',
    deadline: '2026-03-31'
  },
  {
    id: 17,
    title: 'Prompt Engineering for Text-to-Image Diffusion Models',
    authors: 'Huang et al.',
    keywords: ['Prompt Engineering', 'Diffusion Models', 'Text-to-Image', 'Computer Vision'],
    abstract:
      'We provide a comprehensive study of prompt engineering techniques for text-to-image diffusion models.',
    pdfUrl: 'https://arxiv.org/pdf/2305.02326.pdf',
    venue: 'arXiv 2023',
    submittedDate: '2023-05-03',
    deadline: '2026-04-22'
  },
  {
    id: 18,
    title: 'Evaluating Large Language Models on Code Generation',
    authors: 'Chen et al.',
    keywords: ['Code Generation', 'LLM', 'Software Engineering', 'CodeX'],
    abstract:
      'We evaluate the ability of large language models to generate correct and efficient code across various programming tasks.',
    pdfUrl: 'https://arxiv.org/pdf/2306.14836.pdf',
    venue: 'arXiv 2023',
    submittedDate: '2023-06-26',
    deadline: '2026-04-28'
  },
  {
    id: 19,
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks',
    authors: 'Lewis et al.',
    keywords: ['RAG', 'Retrieval', 'NLP', 'Knowledge Base'],
    abstract:
      'We introduce Retrieval-Augmented Generation (RAG), a hybrid model that combines parametric memory with non-parametric memory for knowledge-intensive tasks.',
    pdfUrl: 'https://arxiv.org/pdf/2005.11401.pdf',
    venue: 'NeurIPS 2020',
    submittedDate: '2020-05-22',
    deadline: '2026-04-14'
  },
  {
    id: 20,
    title: 'Convolutional Neural Networks for Sentence Classification',
    authors: 'Kim',
    keywords: ['CNN', 'NLP', 'Text Classification', 'Sentence Encoding'],
    abstract:
      'We report on a series of experiments with convolutional neural networks (CNN) trained on top of pre-trained word vectors for sentence-level classification.',
    pdfUrl: 'https://arxiv.org/pdf/1408.5882.pdf',
    venue: 'EMNLP 2014',
    submittedDate: '2014-08-27',
    deadline: '2026-03-26'
  }
]

export const mockPapers: PaperItem[] = raw.map((item, idx) => {
  const likes = 40 + (idx % 5) * 15
  const comments = (idx % 4) * 2
  const publishedAt = item.submittedDate ? new Date(item.submittedDate).getTime() : Date.now() - idx * 3600_000
  return {
    id: `p${item.id}`,
    title: item.title,
    content: item.abstract,
    author: item.authors,
    avatar: baseAvatar(idx),
    created_at: item.submittedDate || '近期',
    submittedDate: item.submittedDate,
    venue: item.venue,
    pdfUrl: item.pdfUrl,
    publishedAt,
    isUserCreated: false,
    likes,
    comments_count: comments,
    shares: Math.max(2, Math.floor(likes / 10)),
    tags: item.keywords || [],
    isLiked: false,
    comments: [],
    attachments: item.pdfUrl
      ? [
          {
            id: `att-${item.id}`,
            name: `${item.title}.pdf`,
            type: 'application/pdf',
            content: item.pdfUrl
          }
        ]
      : undefined
  }
})
