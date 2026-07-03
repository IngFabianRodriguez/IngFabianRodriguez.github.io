"""
Canonical 365-day table for #365DaysOfAI challenge.

Source of truth: master prompt table provided by the user on 2026-07-02.
Each row now includes:
  day, tema, stack, date (DD/MM/YYYY), mode (auto-classified by classify_mode()).

The `date` field is the original calendar date the user wants each article
to be marked as (Dia 1 = 1/01/2026, Dia 365 = 31/12/2026).
"""

import datetime as _dt

DAYS = [
    (1, "Historia de la IA", "Concepto (Lectura)", _dt.date(2026, 1, 1)),
    (2, "Simbólica vs. Conexionista", "Concepto (Diagramas)", _dt.date(2026, 1, 2)),
    (3, "Escalares y Vectores", "numpy.array, numpy.linalg", _dt.date(2026, 1, 3)),
    (4, "Matrices", "numpy.matrix, numpy.matmul", _dt.date(2026, 1, 4)),
    (5, "Tensores", "torch.tensor o numpy.array", _dt.date(2026, 1, 5)),
    (6, "Autovalores/vectores", "numpy.linalg.eig", _dt.date(2026, 1, 6)),
    (7, "Derivadas/Integrales", "sympy.diff, sympy.integrate", _dt.date(2026, 1, 7)),
    (8, "Gradientes", "torch.autograd.grad", _dt.date(2026, 1, 8)),
    (9, "Regla de la Cadena", "Concepto (Pytorch autograd lo hace auto)", _dt.date(2026, 1, 9)),
    (10, "Teorema de Bayes", "scipy.stats", _dt.date(2026, 1, 10)),
    (11, "Distribuciones", "numpy.random, scipy.stats.norm", _dt.date(2026, 1, 11)),
    (12, "Estadística Descriptiva", "pandas.DataFrame.describe()", _dt.date(2026, 1, 12)),
    (13, "Correlación vs. Causalidad", "pandas.DataFrame.corr()", _dt.date(2026, 1, 13)),
    (14, "P-values / Test Hipótesis", "scipy.stats.ttest_ind", _dt.date(2026, 1, 14)),
    (15, "Entropía de Shannon", "scipy.stats.entropy", _dt.date(2026, 1, 15)),
    (16, "Distancias (Euclidiana, etc.)", "scipy.spatial.distance", _dt.date(2026, 1, 16)),
    (17, "Optimización Matemática", "scipy.optimize", _dt.date(2026, 1, 17)),
    (18, "Mínimos/Máximos", "scipy.signal.argrelextrema", _dt.date(2026, 1, 18)),
    (19, "Intro Python para IA", "python (tipos básicos)", _dt.date(2026, 1, 19)),
    (20, "NumPy Arrays", "numpy", _dt.date(2026, 1, 20)),
    (21, "Pandas DataFrames", "pandas", _dt.date(2026, 1, 21)),
    (22, "Visualización", "matplotlib.pyplot, seaborn", _dt.date(2026, 1, 22)),
    (23, "Entorno (Env)", "conda, venv, poetry", _dt.date(2026, 1, 23)),
    (24, "Notebooks", "jupyter lab, google colab", _dt.date(2026, 1, 24)),
    (25, "Tipos de Datos", "pandas.dtypes", _dt.date(2026, 1, 25)),
    (26, "ETL", "pandas, apache airflow (avanzado)", _dt.date(2026, 1, 26)),
    (27, "Normalización", "sklearn.preprocessing.StandardScaler", _dt.date(2026, 1, 27)),
    (28, "Valores Nulos", "pandas.fillna(), SimpleImputer", _dt.date(2026, 1, 28)),
    (29, "Encodings (One-Hot)", "sklearn.preprocessing.OneHotEncoder", _dt.date(2026, 1, 29)),
    (30, "Train/Test Split", "sklearn.model_selection.train_test_split", _dt.date(2026, 1, 30)),
    (31, "Aprendizaje Supervisado", "Concepto", _dt.date(2026, 1, 31)),
    (32, "Regresión Lineal Simple", "sklearn.linear_model.LinearRegression", _dt.date(2026, 2, 1)),
    (33, "Regresión Lineal Múltiple", "sklearn.linear_model.LinearRegression", _dt.date(2026, 2, 2)),
    (34, "Función de Costo (MSE)", "sklearn.metrics.mean_squared_error", _dt.date(2026, 2, 3)),
    (35, "Descenso del Gradiente", "sklearn.linear_model.SGDRegressor", _dt.date(2026, 2, 4)),
    (36, "Regresión Logística", "sklearn.linear_model.LogisticRegression", _dt.date(2026, 2, 5)),
    (37, "Sigmoide / Softmax", "scipy.special.expit, scipy.special.softmax", _dt.date(2026, 2, 6)),
    (38, "Árboles de Decisión", "sklearn.tree.DecisionTreeClassifier", _dt.date(2026, 2, 7)),
    (39, "Entropía / Gini", "Parámetro criterion='gini' en sklearn", _dt.date(2026, 2, 8)),
    (40, "Pruning", "Parámetro ccp_alpha en sklearn", _dt.date(2026, 2, 9)),
    (41, "Random Forest", "sklearn.ensemble.RandomForestClassifier", _dt.date(2026, 2, 10)),
    (42, "SVM", "sklearn.svm.SVC", _dt.date(2026, 2, 11)),
    (43, "Kernel Trick", "Parámetro kernel='rbf' en SVC", _dt.date(2026, 2, 12)),
    (44, "KNN", "sklearn.neighbors.KNeighborsClassifier", _dt.date(2026, 2, 13)),
    (45, "Naive Bayes", "sklearn.naive_bayes.GaussianNB", _dt.date(2026, 2, 14)),
    (46, "Ensemble (Voting)", "sklearn.ensemble.VotingClassifier", _dt.date(2026, 2, 15)),
    (47, "AdaBoost", "sklearn.ensemble.AdaBoostClassifier", _dt.date(2026, 2, 16)),
    (48, "Gradient Boosting", "sklearn.ensemble.GradientBoostingClassifier", _dt.date(2026, 2, 17)),
    (49, "XGBoost", "xgboost.XGBClassifier", _dt.date(2026, 2, 18)),
    (50, "LightGBM / CatBoost", "lightgbm, catboost", _dt.date(2026, 2, 19)),
    (51, "No Supervisado", "Concepto", _dt.date(2026, 2, 20)),
    (52, "K-Means", "sklearn.cluster.KMeans", _dt.date(2026, 2, 21)),
    (53, "Método del Codo", "yellowbrick.cluster.KElbowVisualizer", _dt.date(2026, 2, 22)),
    (54, "DBSCAN", "sklearn.cluster.DBSCAN", _dt.date(2026, 2, 23)),
    (55, "Clustering Jerárquico", "scipy.cluster.hierarchy.dendrogram", _dt.date(2026, 2, 24)),
    (56, "Reducción Dimensionalidad", "Concepto", _dt.date(2026, 2, 25)),
    (57, "PCA", "sklearn.decomposition.PCA", _dt.date(2026, 2, 26)),
    (58, "t-SNE", "sklearn.manifold.TSNE", _dt.date(2026, 2, 27)),
    (59, "UMAP", "umap-learn", _dt.date(2026, 2, 28)),
    (60, "Detección Anomalías", "sklearn.ensemble.IsolationForest", _dt.date(2026, 3, 1)),
    (61, "Matriz de Confusión", "sklearn.metrics.confusion_matrix", _dt.date(2026, 3, 2)),
    (62, "Accuracy/Precision/Recall", "sklearn.metrics.classification_report", _dt.date(2026, 3, 3)),
    (63, "F1-Score", "sklearn.metrics.f1_score", _dt.date(2026, 3, 4)),
    (64, "ROC / AUC", "sklearn.metrics.roc_auc_score", _dt.date(2026, 3, 5)),
    (65, "Bias vs Variance", "mlxtend.evaluate.bias_variance_decomp", _dt.date(2026, 3, 6)),
    (66, "Over/Underfitting", "Curvas de aprendizaje (Matplotlib)", _dt.date(2026, 3, 7)),
    (67, "Cross-Validation", "sklearn.model_selection.cross_val_score", _dt.date(2026, 3, 8)),
    (68, "Grid/Random Search", "sklearn.model_selection.GridSearchCV, Optuna", _dt.date(2026, 3, 9)),
    (69, "Perceptrón", "sklearn.linear_model.Perceptron", _dt.date(2026, 3, 10)),
    (70, "MLP (Multilayer Perceptron)", "torch.nn.Linear, torch.nn.Sequential", _dt.date(2026, 3, 11)),
    (71, "Forward Propagation", "model(input_tensor) (PyTorch)", _dt.date(2026, 3, 12)),
    (72, "Backpropagation", "loss.backward() (PyTorch)", _dt.date(2026, 3, 13)),
    (73, "Activación: Sigmoid/Tanh", "torch.nn.Sigmoid, torch.nn.Tanh", _dt.date(2026, 3, 14)),
    (74, "Activación: ReLU", "torch.nn.ReLU", _dt.date(2026, 3, 15)),
    (75, "Inicialización Pesos", "torch.nn.init", _dt.date(2026, 3, 16)),
    (76, "Optimizador: SGD", "torch.optim.SGD", _dt.date(2026, 3, 17)),
    (77, "Momentum / RMSprop", "torch.optim.RMSprop", _dt.date(2026, 3, 18)),
    (78, "Optimizador: Adam", "torch.optim.Adam", _dt.date(2026, 3, 19)),
    (79, "Learning Rate / Schedulers", "torch.optim.lr_scheduler", _dt.date(2026, 3, 20)),
    (80, "Batch Size / Epochs", "torch.utils.data.DataLoader", _dt.date(2026, 3, 21)),
    (81, "Regularización L1/L2", "Parámetro weight_decay en optimizador", _dt.date(2026, 3, 22)),
    (82, "Dropout", "torch.nn.Dropout", _dt.date(2026, 3, 23)),
    (83, "Batch Normalization", "torch.nn.BatchNorm1d", _dt.date(2026, 3, 24)),
    (84, "Layer Normalization", "torch.nn.LayerNorm", _dt.date(2026, 3, 25)),
    (85, "Vanishing Gradient", "Monitorizar tensor.grad", _dt.date(2026, 3, 26)),
    (86, "Exploding Gradient", "torch.nn.utils.clip_grad_norm_", _dt.date(2026, 3, 27)),
    (87, "PyTorch vs TensorFlow", "import torch, import tensorflow", _dt.date(2026, 3, 28)),
    (88, "Grafos Computacionales", "torchviz (para visualizar)", _dt.date(2026, 3, 29)),
    (89, "Checkpoints", "torch.save, torch.load", _dt.date(2026, 3, 30)),
    (90, "Transfer Learning", "torchvision.models (param pretrained=True)", _dt.date(2026, 3, 31)),
    (91, "Imágenes (RGB)", "cv2.imread, PIL.Image", _dt.date(2026, 4, 1)),
    (92, "Convolución", "scipy.signal.convolve2d", _dt.date(2026, 4, 2)),
    (93, "Filtros / Kernels", "cv2.filter2D, cv2.Canny", _dt.date(2026, 4, 3)),
    (94, "Pooling", "torch.nn.MaxPool2d", _dt.date(2026, 4, 4)),
    (95, "CNNs", "torch.nn.Conv2d", _dt.date(2026, 4, 5)),
    (96, "LeNet-5", "Implementación manual en PyTorch", _dt.date(2026, 4, 6)),
    (97, "AlexNet", "torchvision.models.alexnet", _dt.date(2026, 4, 7)),
    (98, "VGG", "torchvision.models.vgg16", _dt.date(2026, 4, 8)),
    (99, "ResNet", "torchvision.models.resnet50", _dt.date(2026, 4, 9)),
    (100, "Inception", "torchvision.models.inception_v3", _dt.date(2026, 4, 10)),
    (101, "Data Augmentation", "albumentations, torchvision.transforms", _dt.date(2026, 4, 11)),
    (102, "Clasificación", "timm (PyTorch Image Models)", _dt.date(2026, 4, 12)),
    (103, "Bounding Boxes", "cv2.rectangle", _dt.date(2026, 4, 13)),
    (104, "R-CNN Family", "torchvision.models.detection", _dt.date(2026, 4, 14)),
    (105, "YOLO Arquitectura", "Lectura Paper", _dt.date(2026, 4, 15)),
    (106, "YOLO v8/v10/v11", "ultralytics", _dt.date(2026, 4, 16)),
    (107, "SSD", "torchvision.models.detection.ssd", _dt.date(2026, 4, 17)),
    (108, "IOU", "torchvision.ops.box_iou", _dt.date(2026, 4, 18)),
    (109, "Non-Max Suppression", "torchvision.ops.nms", _dt.date(2026, 4, 19)),
    (110, "Segmentación Semántica", "segmentation-models-pytorch (U-Net)", _dt.date(2026, 4, 20)),
    (111, "Segmentación Instancia", "torchvision.models.detection.maskrcnn", _dt.date(2026, 4, 21)),
    (112, "Reconocimiento Facial", "insightface, deepface", _dt.date(2026, 4, 22)),
    (113, "OCR", "paddleocr, pytesseract", _dt.date(2026, 4, 23)),
    (114, "Pose Estimation", "mediapipe", _dt.date(2026, 4, 24)),
    (115, "Video Analytics", "opencv (VideoCapure), supervision", _dt.date(2026, 4, 25)),
    (116, "3D / Point Clouds", "open3d", _dt.date(2026, 4, 26)),
    (117, "NeRFs", "nerfstudio", _dt.date(2026, 4, 27)),
    (118, "Gaussian Splatting", "gsplat (repo oficial)", _dt.date(2026, 4, 28)),
    (119, "Vision Transformers", "transformers.ViTModel", _dt.date(2026, 4, 29)),
    (120, "SAM (Segment Anything)", "segment-anything (Meta lib)", _dt.date(2026, 4, 30)),
    (121, "Tokenización", "spacy, nltk.word_tokenize", _dt.date(2026, 5, 1)),
    (122, "Stemming/Lemmatization", "spacy (token.lemma_)", _dt.date(2026, 5, 2)),
    (123, "Bag of Words", "sklearn.feature_extraction.text.CountVectorizer", _dt.date(2026, 5, 3)),
    (124, "TF-IDF", "sklearn.feature_extraction.text.TfidfVectorizer", _dt.date(2026, 5, 4)),
    (125, "N-Grams", "CountVectorizer(ngram_range=(1,2))", _dt.date(2026, 5, 5)),
    (126, "Embeddings", "Concepto", _dt.date(2026, 5, 6)),
    (127, "Word2Vec", "gensim.models.Word2Vec", _dt.date(2026, 5, 7)),
    (128, "GloVe / FastText", "gensim.models.FastText", _dt.date(2026, 5, 8)),
    (129, "Similitud Coseno", "sklearn.metrics.pairwise.cosine_similarity", _dt.date(2026, 5, 9)),
    (130, "RNNs", "torch.nn.RNN", _dt.date(2026, 5, 10)),
    (131, "Memoria corto plazo", "Problema teórico", _dt.date(2026, 5, 11)),
    (132, "LSTM", "torch.nn.LSTM", _dt.date(2026, 5, 12)),
    (133, "GRU", "torch.nn.GRU", _dt.date(2026, 5, 13)),
    (134, "Seq2Seq", "Arquitectura Encoder-Decoder manual", _dt.date(2026, 5, 14)),
    (135, "Attention Mechanism", "torch.nn.MultiheadAttention", _dt.date(2026, 5, 15)),
    (136, "Paper \"Attention is All...\"", "Lectura (ArXiv)", _dt.date(2026, 5, 16)),
    (137, "Transformer Arch", "transformers.BertModel (Estructura base)", _dt.date(2026, 5, 17)),
    (138, "Self-Attention", "Implementación interna en HF", _dt.date(2026, 5, 18)),
    (139, "Positional Encoding", "Fórmula matemática / Tensor", _dt.date(2026, 5, 19)),
    (140, "BERT", "transformers.BertForMaskedLM", _dt.date(2026, 5, 20)),
    (141, "MLM", "Tarea de entrenamiento", _dt.date(2026, 5, 21)),
    (142, "GPT (Historia)", "Concepto", _dt.date(2026, 5, 22)),
    (143, "Causal LM", "transformers.GPT2LMHeadModel", _dt.date(2026, 5, 23)),
    (144, "T5", "transformers.T5ForConditionalGeneration", _dt.date(2026, 5, 24)),
    (145, "Librería Transformers", "pip install transformers", _dt.date(2026, 5, 25)),
    (146, "Tokenizers HF", "transformers.AutoTokenizer", _dt.date(2026, 5, 26)),
    (147, "Model Hubs", "huggingface-cli", _dt.date(2026, 5, 27)),
    (148, "Métricas (BLEU/ROUGE)", "evaluate (HF library), sacrebleu", _dt.date(2026, 5, 28)),
    (149, "Perplexity", "torch.exp(loss)", _dt.date(2026, 5, 29)),
    (150, "Análisis Sentimiento", "transformers.pipeline(\"sentiment-analysis\")", _dt.date(2026, 5, 30)),
    (151, "LLMs Definición", "Concepto", _dt.date(2026, 5, 31)),
    (152, "Scaling Laws", "Concepto", _dt.date(2026, 6, 1)),
    (153, "Few-shot Learning", "Prompt structure", _dt.date(2026, 6, 2)),
    (154, "Prompt Engineering", "langchain.prompts.PromptTemplate", _dt.date(2026, 6, 3)),
    (155, "Chain-of-Thought", "Prompt structure", _dt.date(2026, 6, 4)),
    (156, "Tree of Thoughts", "langchain_experimental (o implementación custom)", _dt.date(2026, 6, 5)),
    (157, "Prompt Injection", "lakera/gard (herramientas de seguridad)", _dt.date(2026, 6, 6)),
    (158, "Temp/Top-k/Top-p", "Parámetros API OpenAI / HF", _dt.date(2026, 6, 7)),
    (159, "Alucinaciones", "Concepto (Mitigación vía RAG)", _dt.date(2026, 6, 8)),
    (160, "Context Window", "Configuración de modelo", _dt.date(2026, 6, 9)),
    (161, "RAG", "llama_index", _dt.date(2026, 6, 10)),
    (162, "Chunking", "langchain.text_splitter", _dt.date(2026, 6, 11)),
    (163, "Vector Databases", "pinecone, milvus, chromadb", _dt.date(2026, 6, 12)),
    (164, "Embeddings RAG", "openai-python (text-embedding-3), sentence-transformers", _dt.date(2026, 6, 13)),
    (165, "Reranking", "cohere (API), flashrank", _dt.date(2026, 6, 14)),
    (166, "Knowledge Graphs + LLM", "neo4j, langchain_community.graphs", _dt.date(2026, 6, 15)),
    (167, "Fine-Tuning Full", "torch.optim (muy costoso)", _dt.date(2026, 6, 16)),
    (168, "PEFT", "peft (HF library)", _dt.date(2026, 6, 17)),
    (169, "LoRA", "peft.LoraConfig", _dt.date(2026, 6, 18)),
    (170, "QLoRA", "bitsandbytes + peft", _dt.date(2026, 6, 19)),
    (171, "Quantization", "bitsandbytes, auto-gptq", _dt.date(2026, 6, 20)),
    (172, "RLHF", "trl (Transformer Reinforcement Learning)", _dt.date(2026, 6, 21)),
    (173, "DPO", "trl.DPOTrainer", _dt.date(2026, 6, 22)),
    (174, "Open vs Closed", "meta-llama vs openai", _dt.date(2026, 6, 23)),
    (175, "Ollama", "ollama (CLI y libreria python)", _dt.date(2026, 6, 24)),
    (176, "GGUF", "llama-cpp-python", _dt.date(2026, 6, 25)),
    (177, "vLLM", "vllm (Servidor de inferencia)", _dt.date(2026, 6, 26)),
    (178, "Eval LLMs", "ragas, deepeval", _dt.date(2026, 6, 27)),
    (179, "LangChain", "langchain", _dt.date(2026, 6, 28)),
    (180, "LlamaIndex", "llama_index", _dt.date(2026, 6, 29)),
    (181, "Agentes", "langchain.agents", _dt.date(2026, 6, 30)),
    (182, "ReAct", "langchain.agents.AgentType.REACT", _dt.date(2026, 7, 1)),
    (183, "Tool Calling", "openai (tools parameter), pydantic", _dt.date(2026, 7, 2)),
    (184, "Planificación", "Lógica custom en LangGraph", _dt.date(2026, 7, 3)),
    (185, "Memoria", "langchain.memory, mem0", _dt.date(2026, 7, 4)),
    (186, "Multi-Agente", "crewai, autogen", _dt.date(2026, 7, 5)),
    (187, "LangGraph", "langgraph", _dt.date(2026, 7, 6)),
    (188, "Gen Imágenes", "Concepto", _dt.date(2026, 7, 7)),
    (189, "VAEs", "diffusers.AutoencoderKL", _dt.date(2026, 7, 8)),
    (190, "GANs", "Implementación PyTorch Custom", _dt.date(2026, 7, 9)),
    (191, "Diffusion Models", "diffusers", _dt.date(2026, 7, 10)),
    (192, "Forward/Reverse Process", "diffusers.schedulers", _dt.date(2026, 7, 11)),
    (193, "Stable Diffusion", "diffusers.StableDiffusionPipeline", _dt.date(2026, 7, 12)),
    (194, "ControlNet", "diffusers.ControlNetModel", _dt.date(2026, 7, 13)),
    (195, "IP-Adapter", "IP-Adapter (repo oficial)", _dt.date(2026, 7, 14)),
    (196, "Audio Espectrogramas", "librosa.display.specshow", _dt.date(2026, 7, 15)),
    (197, "ASR", "speech_recognition", _dt.date(2026, 7, 16)),
    (198, "Whisper", "faster-whisper, openai-whisper", _dt.date(2026, 7, 17)),
    (199, "TTS", "coqui-ai, edge-tts", _dt.date(2026, 7, 18)),
    (200, "Clonación Voz", "elevenlabs (API), tortoise-tts", _dt.date(2026, 7, 19)),
    (201, "Separación Audio", "demucs (Meta)", _dt.date(2026, 7, 20)),
    (202, "Multimodales", "transformers.LlavaForConditionalGeneration", _dt.date(2026, 7, 21)),
    (203, "CLIP", "clip (OpenAI repo), transformers.CLIPModel", _dt.date(2026, 7, 22)),
    (204, "LLaVA", "transformers (versiones recientes)", _dt.date(2026, 7, 23)),
    (205, "GPT-4o", "openai (API)", _dt.date(2026, 7, 24)),
    (206, "Gen Video", "runway (API)", _dt.date(2026, 7, 25)),
    (207, "3D Gen", "threestudio", _dt.date(2026, 7, 26)),
    (208, "Watermarking", "imwatermark", _dt.date(2026, 7, 27)),
    (209, "Deepfakes", "Herramientas forenses (Deepware)", _dt.date(2026, 7, 28)),
    (210, "Copyright", "Legal", _dt.date(2026, 7, 29)),
    (211, "Ciclo ML", "Concepto", _dt.date(2026, 7, 30)),
    (212, "Git", "git", _dt.date(2026, 7, 31)),
    (213, "DVC", "dvc (CLI)", _dt.date(2026, 8, 1)),
    (214, "Feature Stores", "feast", _dt.date(2026, 8, 2)),
    (215, "Docker", "docker, Dockerfile", _dt.date(2026, 8, 3)),
    (216, "Kubernetes", "kubectl, minikube", _dt.date(2026, 8, 4)),
    (217, "Pipelines", "apache-airflow, kfp (Kubeflow Pipelines)", _dt.date(2026, 8, 5)),
    (218, "CI/CD ML", "cml (Iterative), GitHub Actions", _dt.date(2026, 8, 6)),
    (219, "Tracking Exps", "mlflow, wandb", _dt.date(2026, 8, 7)),
    (220, "Model Registry", "mlflow.register_model", _dt.date(2026, 8, 8)),
    (221, "APIs REST", "fastapi, uvicorn", _dt.date(2026, 8, 9)),
    (222, "gRPC", "grpcio", _dt.date(2026, 8, 10)),
    (223, "TorchServe", "torchserve", _dt.date(2026, 8, 11)),
    (224, "Triton", "tritonserver (NVIDIA container)", _dt.date(2026, 8, 12)),
    (225, "Serverless", "modal, aws lambda", _dt.date(2026, 8, 13)),
    (226, "Batch vs Online", "Arquitectura", _dt.date(2026, 8, 14)),
    (227, "Latencia/Throughput", "locust (Load testing)", _dt.date(2026, 8, 15)),
    (228, "Model Monitoring", "evidently", _dt.date(2026, 8, 16)),
    (229, "Drift", "alibi-detect", _dt.date(2026, 8, 17)),
    (230, "A/B Testing", "Feature Flags (LaunchDarkly)", _dt.date(2026, 8, 18)),
    (231, "Shadow Deployment", "Istio / K8s config", _dt.date(2026, 8, 19)),
    (232, "Canary", "Argo Rollouts", _dt.date(2026, 8, 20)),
    (233, "Autoscaling", "KEDA (K8s Event-driven Autoscaling)", _dt.date(2026, 8, 21)),
    (234, "Costos Cloud", "infracost", _dt.date(2026, 8, 22)),
    (235, "ONNX", "onnx, onnxruntime", _dt.date(2026, 8, 23)),
    (236, "TensorRT", "tensorrt", _dt.date(2026, 8, 24)),
    (237, "Edge AI", "tflite-runtime", _dt.date(2026, 8, 25)),
    (238, "TFLite / CoreML", "coremltools", _dt.date(2026, 8, 26)),
    (239, "Federated Learning", "flower (flwr), tensorflow-federated", _dt.date(2026, 8, 27)),
    (240, "Privacidad Diferencial", "opacus (PyTorch)", _dt.date(2026, 8, 28)),
    (241, "Conceptos Agente/Env", "Teoría", _dt.date(2026, 8, 29)),
    (242, "MDP", "Teoría", _dt.date(2026, 8, 30)),
    (243, "Políticas", "Código Python Custom", _dt.date(2026, 8, 31)),
    (244, "Descuento (Gamma)", "Parámetro en algoritmos", _dt.date(2026, 9, 1)),
    (245, "Epsilon-Greedy", "Lógica condicional Python", _dt.date(2026, 9, 2)),
    (246, "V/Q Functions", "Tablas NumPy", _dt.date(2026, 9, 3)),
    (247, "Ecuación Bellman", "Fórmula", _dt.date(2026, 9, 4)),
    (248, "Monte Carlo", "Implementación Python", _dt.date(2026, 9, 5)),
    (249, "TD Learning", "Implementación Python", _dt.date(2026, 9, 6)),
    (250, "Q-Learning", "Implementación con tabla NumPy", _dt.date(2026, 9, 7)),
    (251, "DQN", "stable_baselines3.DQN", _dt.date(2026, 9, 8)),
    (252, "Experience Replay", "Buffer interno en SB3", _dt.date(2026, 9, 9)),
    (253, "Target Networks", "Interno en SB3", _dt.date(2026, 9, 10)),
    (254, "Policy Gradients", "Implementación Vanilla PG", _dt.date(2026, 9, 11)),
    (255, "REINFORCE", "Implementación Custom", _dt.date(2026, 9, 12)),
    (256, "Actor-Critic", "stable_baselines3.A2C", _dt.date(2026, 9, 13)),
    (257, "A2C / A3C", "stable_baselines3.A2C", _dt.date(2026, 9, 14)),
    (258, "PPO", "stable_baselines3.PPO", _dt.date(2026, 9, 15)),
    (259, "TRPO", "sb3_contrib.TRPO", _dt.date(2026, 9, 16)),
    (260, "Model-Based", "Librerías especializadas (MBRL-Lib)", _dt.date(2026, 9, 17)),
    (261, "Inverse RL", "imitation (Librería compatible con Gym)", _dt.date(2026, 9, 18)),
    (262, "MARL", "pettingzoo", _dt.date(2026, 9, 19)),
    (263, "MCTS (AlphaGo)", "Implementaciones custom", _dt.date(2026, 9, 20)),
    (264, "Gymnasium", "gymnasium", _dt.date(2026, 9, 21)),
    (265, "MuJoCo", "mujoco", _dt.date(2026, 9, 22)),
    (266, "Sim2Real", "Concepto", _dt.date(2026, 9, 23)),
    (267, "Curriculum Learning", "Lógica custom de entrenamiento", _dt.date(2026, 9, 24)),
    (268, "Offline RL", "d3rlpy", _dt.date(2026, 9, 25)),
    (269, "World Models", "Research papers", _dt.date(2026, 9, 26)),
    (270, "Apps RL", "Casos de uso", _dt.date(2026, 9, 27)),
    (271, "Probabilidad Avanzada", "pymc, tf-probability", _dt.date(2026, 9, 28)),
    (272, "Inferencia Variacional", "pyro.infer", _dt.date(2026, 9, 29)),
    (273, "MCMC", "pymc.sample", _dt.date(2026, 9, 30)),
    (274, "Procesos Gaussianos", "gpytorch, scikit-learn", _dt.date(2026, 10, 1)),
    (275, "Grafos Teoría", "networkx", _dt.date(2026, 10, 2)),
    (276, "GNNs", "torch_geometric", _dt.date(2026, 10, 3)),
    (277, "GCN", "torch_geometric.nn.GCNConv", _dt.date(2026, 10, 4)),
    (278, "GAT", "torch_geometric.nn.GATConv", _dt.date(2026, 10, 5)),
    (279, "Neural ODEs", "torchdiffeq", _dt.date(2026, 10, 6)),
    (280, "TDA", "giotto-tda", _dt.date(2026, 10, 7)),
    (281, "Manifold Learning", "sklearn.manifold", _dt.date(2026, 10, 8)),
    (282, "Geometría Info", "Teoría", _dt.date(2026, 10, 9)),
    (283, "Optimizadores 2do orden", "torch.optim.LBFGS", _dt.date(2026, 10, 10)),
    (284, "Meta-Learning", "learn2learn", _dt.date(2026, 10, 11)),
    (285, "MAML", "learn2learn.algorithms.MAML", _dt.date(2026, 10, 12)),
    (286, "Self-Supervised", "lightly (SSL library)", _dt.date(2026, 10, 13)),
    (287, "Contrastive (SimCLR)", "lightly.models.SimCLR", _dt.date(2026, 10, 14)),
    (288, "Masked Autoencoders", "transformers.ViTMAE", _dt.date(2026, 10, 15)),
    (289, "Energy-Based", "Research Code", _dt.date(2026, 10, 16)),
    (290, "Normalizing Flows", "nflows", _dt.date(2026, 10, 17)),
    (291, "Causal Inference", "dowhy, causalml", _dt.date(2026, 10, 18)),
    (292, "DAGs", "networkx", _dt.date(2026, 10, 19)),
    (293, "Do-calculus", "dowhy", _dt.date(2026, 10, 20)),
    (294, "Counterfactuals", "dice-ml", _dt.date(2026, 10, 21)),
    (295, "Neuro-symbolic", "scallop (Lang)", _dt.date(2026, 10, 22)),
    (296, "Sparse NN", "torch.sparse", _dt.date(2026, 10, 23)),
    (297, "Lottery Ticket", "Pruning methods", _dt.date(2026, 10, 24)),
    (298, "Distillation", "Logits matching (Custom loss)", _dt.date(2026, 10, 25)),
    (299, "NAS", "nni (Microsoft)", _dt.date(2026, 10, 26)),
    (300, "AutoML", "auto-sklearn, h2o", _dt.date(2026, 10, 27)),
    (301, "Bias Algorítmico", "Análisis de datos", _dt.date(2026, 10, 28)),
    (302, "Fairness Métricas", "fairlearn.metrics", _dt.date(2026, 10, 29)),
    (303, "XAI", "Concepto", _dt.date(2026, 10, 30)),
    (304, "SHAP / LIME", "shap, lime", _dt.date(2026, 10, 31)),
    (305, "Cajas Negras", "Concepto", _dt.date(2026, 11, 1)),
    (306, "Alignment", "Investigación (Anthropic/OpenAI)", _dt.date(2026, 11, 2)),
    (307, "Adversarial Attacks", "art (Adversarial Robustness Toolbox)", _dt.date(2026, 11, 3)),
    (308, "Privacidad", "presidio-analyzer", _dt.date(2026, 11, 4)),
    (309, "GDPR", "Legal", _dt.date(2026, 11, 5)),
    (310, "EU AI Act", "Legal", _dt.date(2026, 11, 6)),
    (311, "Regulación Global", "Legal", _dt.date(2026, 11, 7)),
    (312, "Copyright Datasets", "Términos de servicio", _dt.date(2026, 11, 8)),
    (313, "Licencias", "Apache 2.0, MIT, RAIL", _dt.date(2026, 11, 9)),
    (314, "Huella Carbono", "codecarbon", _dt.date(2026, 11, 10)),
    (315, "Automatización", "Economía", _dt.date(2026, 11, 11)),
    (316, "Sesgo Confirmación", "Psicología", _dt.date(2026, 11, 12)),
    (317, "Filter Bubbles", "Análisis de redes", _dt.date(2026, 11, 13)),
    (318, "Responsabilidad Civil", "Legal", _dt.date(2026, 11, 14)),
    (319, "Armas Autónomas", "Ética Militar", _dt.date(2026, 11, 15)),
    (320, "Bioseguridad", "Protocolos", _dt.date(2026, 11, 16)),
    (321, "IA Soberana", "Infraestructura", _dt.date(2026, 11, 17)),
    (322, "Open vs Closed Security", "Debate", _dt.date(2026, 11, 18)),
    (323, "Antropomorfización", "Psicología", _dt.date(2026, 11, 19)),
    (324, "Test Turing", "Historia", _dt.date(2026, 11, 20)),
    (325, "Consciencia", "Filosofía", _dt.date(2026, 11, 21)),
    (326, "Singularidad", "Futurismo", _dt.date(2026, 11, 22)),
    (327, "X-Risk", "Filosofía", _dt.date(2026, 11, 23)),
    (328, "Superinteligencia", "Libro (Bostrom)", _dt.date(2026, 11, 24)),
    (329, "Orgs Seguridad", "OpenAI, Anthropic", _dt.date(2026, 11, 25)),
    (330, "AI Governance", "Policy", _dt.date(2026, 11, 26)),
    (331, "CPU/GPU/TPU", "Hardware", _dt.date(2026, 11, 27)),
    (332, "Arq GPU", "nvidia-smi", _dt.date(2026, 11, 28)),
    (333, "CUDA", "numba.cuda, cupy", _dt.date(2026, 11, 29)),
    (334, "H100/A100", "Cloud Instances", _dt.date(2026, 11, 30)),
    (335, "ASICs", "Groq API", _dt.date(2026, 12, 1)),
    (336, "Neuromorphic", "Loihi (Intel)", _dt.date(2026, 12, 2)),
    (337, "SNNs", "snntorch", _dt.date(2026, 12, 3)),
    (338, "Quantum ML", "pennylane, qiskit", _dt.date(2026, 12, 4)),
    (339, "Computación Óptica", "Investigación", _dt.date(2026, 12, 5)),
    (340, "Edge Hardware", "Jetson Nano, RPi", _dt.date(2026, 12, 6)),
    (341, "AWS SageMaker", "boto3, sagemaker SDK", _dt.date(2026, 12, 7)),
    (342, "Vertex AI", "google-cloud-aiplatform", _dt.date(2026, 12, 8)),
    (343, "Azure AI", "azure-ai-ml", _dt.date(2026, 12, 9)),
    (344, "Databricks", "pyspark, mlflow", _dt.date(2026, 12, 10)),
    (345, "SLMs (Small Models)", "phi-3, gemma", _dt.date(2026, 12, 11)),
    (346, "1-bit LLMs", "bitnet", _dt.date(2026, 12, 12)),
    (347, "Reasoning Models", "OpenAI o1", _dt.date(2026, 12, 13)),
    (348, "Embodied AI", "Simuladores", _dt.date(2026, 12, 14)),
    (349, "Leer Papers", "arxiv.org", _dt.date(2026, 12, 15)),
    (350, "Reproducibilidad", "docker, seeds fijas", _dt.date(2026, 12, 16)),
    (351, "Portafolio", "github", _dt.date(2026, 12, 17)),
    (352, "Kaggle", "kaggle CLI", _dt.date(2026, 12, 18)),
    (353, "HF Spaces", "gradio, streamlit", _dt.date(2026, 12, 19)),
    (354, "Open Source", "git pull request", _dt.date(2026, 12, 20)),
    (355, "Soft Skills", "PowerPoint / Jupyter", _dt.date(2026, 12, 21)),
    (356, "Roles Ciencia Datos", "LinkedIn", _dt.date(2026, 12, 22)),
    (357, "Roles Product Mgr", "Jira", _dt.date(2026, 12, 23)),
    (358, "Roles Prompt Eng", "Playgrounds", _dt.date(2026, 12, 24)),
    (359, "Entrevistas", "leetcode", _dt.date(2026, 12, 25)),
    (360, "Aprendizaje Continuo", "Newsletters", _dt.date(2026, 12, 26)),
    (361, "Networking", "Eventos", _dt.date(2026, 12, 27)),
    (362, "Ética Profesional", "Código de conducta", _dt.date(2026, 12, 28)),
    (363, "Realidad vs Hype", "Pensamiento crítico", _dt.date(2026, 12, 29)),
    (364, "Copilots", "github copilot, cursor", _dt.date(2026, 12, 30)),
    (365, "AGI", "La meta", _dt.date(2026, 12, 31)),
]


# Mode classification (unchanged from prior session).
CONCEPT_KEYWORDS = {
    "Concepto", "Teoría", "Historia", "Filosofía", "Psicología",
    "Ética", "Ética Militar", "Legal", "Economía", "Futurismo",
    "Debate", "Policy", "Libro (",
}

TOOL_KEYWORDS = {
    # CLI / orchestration
    "docker", "kubectl", "minikube", "GitHub Actions", "GitHub", "argo",
    "keda", "istio",
    # ML infra tools
    "mlflow", "wandb", "feast", "evidently", "alibi", "locust",
    "launchdarkly", "infracost", "codecarbon",
    # DVC / data versioning
    "dvc", "dvc (CLI)",
    # feature stores / pipelines
    "apache-airflow", "apache airflow", "airflow", "kfp",
    # serving / inference
    "torchserve", "triton", "tritonserver", "vllm", "ollama",
    "tensorrt", "tflite", "coreml", "coremltools", "onnx",
    "tensorrt", "lambda",
    # registry / model hub CLI
    "huggingface-cli", "kaggle (CLI)", "kaggle CLI",
    # hardware
    "nvidia-smi", "GPU", "TPU", "Cloud Instances", "jetson",
    "Jetson", "Loihi", "Groq", "numba.cuda", "cupy",
    # cloud SDKs
    "boto3", "sagemaker", "google-cloud", "azure-ai", "pyspark",
    # APIs/cloud
    "Runway (API)", "elevenlabs (API)", "openai (API)", "groq API",
}

PAPER_KEYWORDS = {
    "Lectura Paper", "Lectura (ArXiv)", "Research papers",
    "Research Code",
}

CAREER_KEYWORDS = {
    "LinkedIn", "Jira", "Playgrounds", "leetcode",
    "Newsletters", "Eventos", "Código de conducta", "github",
    "Portafolio",
}


def classify_mode(stack: str) -> str:
    """Classify a day into Modo A/B/C/D/E based on STACK field."""
    s = stack.strip()
    if any(k.lower() in s.lower() for k in CAREER_KEYWORDS):
        return "E"
    if any(k in s for k in PAPER_KEYWORDS):
        return "D"
    if any(k.lower() in s.lower() for k in TOOL_KEYWORDS):
        return "C"
    if s.startswith("Concepto") or any(s.startswith(k) for k in CONCEPT_KEYWORDS):
        return "B"
    return "A"


# Day-level overrides (priority over classify_mode above).
MODE_OVERRIDES: dict[int, str] = {
    # Concept-themed but where the topic is purely philosophy/ethics
    153: "B",   # Few-shot Learning — Prompt structure (concept)
    155: "B",   # Chain-of-Thought — Prompt structure (concept)
    159: "B",   # Alucinaciones — Concept (mitigación via RAG)
    167: "A",   # Fine-Tuning Full — torch.optim (costosísimo) = production code
    # Tools/Infra explicit (overrides that auto-classifier may misroute)
    26: "C",    # ETL — pandas + apache airflow = infra
    31: "B",   # Aprendizaje Supervisado — Concepto
    51: "B",   # Aprendizaje No Supervisado — Concepto
    56: "B",   # Reducción Dimensionalidad — Concepto
    65: "A",   # Bias vs Variance — mlxtend code
    66: "A",   # Over/Underfitting — Curvas de aprendizaje
    68: "A",   # Grid/Random Search — sklearn + Optuna
    126: "B",  # Embeddings — Concepto
    131: "B",  # Memoria corto plazo — Problema teórico
    141: "B",  # MLM — Tarea de entrenamiento (concept)
    142: "B",  # GPT (Historia) — Concepto
    151: "B",  # LLMs Definición — Concepto
    152: "B",  # Scaling Laws — Concepto
    158: "C",  # Temp/Top-k/Top-p — API params (tooling)
    160: "C",  # Context Window — Configuración de modelo
    174: "B",  # Open vs Closed — meta-llama vs openai (debate)
    188: "B",  # Gen Imágenes — Concepto
    211: "B",  # Ciclo ML — Concepto
    226: "C",  # Batch vs Online — Arquitectura (infra)
    242: "B",  # MDP — Teoría
    244: "A",  # Descuento (Gamma) — Parámetro en algoritmos
    247: "B",  # Ecuación Bellman — Fórmula (math heavy, no code)
    261: "A",  # Inverse RL — imitation library
    266: "B",  # Sim2Real — Concepto
    270: "B",  # Apps RL — Casos de uso
    282: "B",  # Geometría Info — Teoría
    301: "B",  # Bias Algorítmico — Análisis (concept)
    303: "B",  # XAI — Concepto
    305: "B",  # Cajas Negras — Concepto
    306: "B",  # Alignment — Investigación (Anthropic/OpenAI)
    309: "B",  # GDPR — Legal
    310: "B",  # EU AI Act — Legal
    311: "B",  # Regulación Global — Legal
    312: "B",  # Copyright Datasets — Términos
    313: "B",  # Licencias — Apache, MIT, RAIL (legal)
    315: "B",  # Automatización — Economía
    316: "B",  # Sesgo Confirmación — Psicología
    317: "B",  # Filter Bubbles — Análisis de redes (concept)
    318: "B",  # Responsabilidad Civil — Legal
    319: "B",  # Armas Autónomas — Ética Militar
    320: "B",  # Bioseguridad — Protocolos
    321: "B",  # IA Soberana — Infraestructura (concept)
    322: "B",  # Open vs Closed Security — Debate
    323: "B",  # Antropomorfización — Psicología
    324: "B",  # Test Turing — Historia
    325: "B",  # Consciencia — Filosofía
    326: "B",  # Singularidad — Futurismo
    327: "B",  # X-Risk — Filosofía
    328: "B",  # Superinteligencia — Libro (Bostrom)
    330: "B",  # AI Governance — Policy
    339: "B",  # Computación Óptica — Investigación
    348: "B",  # Embodied AI — Simuladores (concept+hardware)
    349: "B",  # Leer Papers — arxiv.org (carrera/proceso, no paper específico)
    350: "C",  # Reproducibilidad — docker, seeds (infra)
    355: "E",  # Soft Skills — PowerPoint/Jupyter
    360: "B",  # Aprendizaje Continuo — Newsletters (concept+herramienta)
    362: "E",  # Ética Profesional — Código de conducta
    363: "B",  # Realidad vs Hype — Pensamiento crítico (concept)
    365: "B",  # AGI — La meta (concept)
}


def get_mode(day: int, stack: str) -> str:
    """Get mode for a day, with manual overrides applied."""
    if day in MODE_OVERRIDES:
        return MODE_OVERRIDES[day]
    return classify_mode(stack)


def get_date(day: int) -> _dt.date:
    """Return the canonical calendar date for the given day (1..365)."""
    for d, _t, _s, date in DAYS:
        if d == day:
            return date
    raise ValueError(f"day {day} not in canonical table")


def slugify(text: str) -> str:
    """Convert tema to a filesystem-safe slug."""
    import re
    import unicodedata
    text = text.strip().lower()
    text = text.strip('"').strip()
    text = "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text


def build_path(day: int, tema: str, _slug: str = None) -> str:
    """Build folder name for a day, e.g. dia-113365-ocr/."""
    s = _slug if _slug is not None else slugify(tema)
    return f"dia-{day}365-{s}"


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "table":
        print("| day | tema | stack | mode | date | slug | path |")
        print("|-----|------|-------|------|------|------|------|")
        for d, t, s, date in DAYS:
            m = get_mode(d, s)
            sl = slugify(t)
            p = build_path(d, t, sl)
            print(f"| {d} | {t} | {s} | {m} | {date.isoformat()} | {sl} | {p} |")