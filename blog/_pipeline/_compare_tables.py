"""Compare the user-provided canonical table with the current days_table.py."""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from days_table import DAYS as CURRENT  # type: ignore

# Parse the user-provided text into rows.
# Format: "Dia: N | Tema: X | Stack: Y\t<date>"
# (the date is informational; we only use day+tema+stack here)
USER_TEXT = """\
1|Historia de la IA|Concepto (Lectura)
2|Simbólica vs. Conexionista|Concepto (Diagramas)
3|Escalares y Vectores|numpy.array, numpy.linalg
4|Matrices|numpy.matrix, numpy.matmul
5|Tensores|torch.tensor o numpy.array
6|Autovalores/vectores|numpy.linalg.eig
7|Derivadas/Integrales|sympy.diff, sympy.integrate
8|Gradientes|torch.autograd.grad
9|Regla de la Cadena|Concepto (Pytorch autograd lo hace auto)
10|Teorema de Bayes|scipy.stats
11|Distribuciones|numpy.random, scipy.stats.norm
12|Estadística Descriptiva|pandas.DataFrame.describe()
13|Correlación vs. Causalidad|pandas.DataFrame.corr()
14|P-values / Test Hipótesis|scipy.stats.ttest_ind
15|Entropía de Shannon|scipy.stats.entropy
16|Distancias (Euclidiana, etc.)|scipy.spatial.distance
17|Optimización Matemática|scipy.optimize
18|Mínimos/Máximos|scipy.signal.argrelextrema
19|Intro Python para IA|python (tipos básicos)
20|NumPy Arrays|numpy
21|Pandas DataFrames|pandas
22|Visualización|matplotlib.pyplot, seaborn
23|Entorno (Env)|conda, venv, poetry
24|Notebooks|jupyter lab, google colab
25|Tipos de Datos|pandas.dtypes
26|ETL|pandas, apache airflow (avanzado)
27|Normalización|sklearn.preprocessing.StandardScaler
28|Valores Nulos|pandas.fillna(), SimpleImputer
29|Encodings (One-Hot)|sklearn.preprocessing.OneHotEncoder
30|Train/Test Split|sklearn.model_selection.train_test_split
31|Aprendizaje Supervisado|Concepto
32|Regresión Lineal Simple|sklearn.linear_model.LinearRegression
33|Regresión Lineal Múltiple|sklearn.linear_model.LinearRegression
34|Función de Costo (MSE)|sklearn.metrics.mean_squared_error
35|Descenso del Gradiente|sklearn.linear_model.SGDRegressor
36|Regresión Logística|sklearn.linear_model.LogisticRegression
37|Sigmoide / Softmax|scipy.special.expit, scipy.special.softmax
38|Árboles de Decisión|sklearn.tree.DecisionTreeClassifier
39|Entropía / Gini|Parámetro criterion='gini' en sklearn
40|Pruning|Parámetro ccp_alpha en sklearn
41|Random Forest|sklearn.ensemble.RandomForestClassifier
42|SVM|sklearn.svm.SVC
43|Kernel Trick|Parámetro kernel='rbf' en SVC
44|KNN|sklearn.neighbors.KNeighborsClassifier
45|Naive Bayes|sklearn.naive_bayes.GaussianNB
46|Ensemble (Voting)|sklearn.ensemble.VotingClassifier
47|AdaBoost|sklearn.ensemble.AdaBoostClassifier
48|Gradient Boosting|sklearn.ensemble.GradientBoostingClassifier
49|XGBoost|xgboost.XGBClassifier
50|LightGBM / CatBoost|lightgbm, catboost
51|No Supervisado|Concepto
52|K-Means|sklearn.cluster.KMeans
53|Método del Codo|yellowbrick.cluster.KElbowVisualizer
54|DBSCAN|sklearn.cluster.DBSCAN
55|Clustering Jerárquico|scipy.cluster.hierarchy.dendrogram
56|Reducción Dimensionalidad|Concepto
57|PCA|sklearn.decomposition.PCA
58|t-SNE|sklearn.manifold.TSNE
59|UMAP|umap-learn
60|Detección Anomalías|sklearn.ensemble.IsolationForest
61|Matriz de Confusión|sklearn.metrics.confusion_matrix
62|Accuracy/Precision/Recall|sklearn.metrics.classification_report
63|F1-Score|sklearn.metrics.f1_score
64|ROC / AUC|sklearn.metrics.roc_auc_score
65|Bias vs Variance|mlxtend.evaluate.bias_variance_decomp
66|Over/Underfitting|Curvas de aprendizaje (Matplotlib)
67|Cross-Validation|sklearn.model_selection.cross_val_score
68|Grid/Random Search|sklearn.model_selection.GridSearchCV, Optuna
69|Perceptrón|sklearn.linear_model.Perceptron
70|MLP (Multilayer Perceptron)|torch.nn.Linear, torch.nn.Sequential
71|Forward Propagation|model(input_tensor) (PyTorch)
72|Backpropagation|loss.backward() (PyTorch)
73|Activación: Sigmoid/Tanh|torch.nn.Sigmoid, torch.nn.Tanh
74|Activación: ReLU|torch.nn.ReLU
75|Inicialización Pesos|torch.nn.init
76|Optimizador: SGD|torch.optim.SGD
77|Momentum / RMSprop|torch.optim.RMSprop
78|Optimizador: Adam|torch.optim.Adam
79|Learning Rate / Schedulers|torch.optim.lr_scheduler
80|Batch Size / Epochs|torch.utils.data.DataLoader
81|Regularización L1/L2|Parámetro weight_decay en optimizador
82|Dropout|torch.nn.Dropout
83|Batch Normalization|torch.nn.BatchNorm1d
84|Layer Normalization|torch.nn.LayerNorm
85|Vanishing Gradient|Monitorizar tensor.grad
86|Exploding Gradient|torch.nn.utils.clip_grad_norm_
87|PyTorch vs TensorFlow|import torch, import tensorflow
88|Grafos Computacionales|torchviz (para visualizar)
89|Checkpoints|torch.save, torch.load
90|Transfer Learning|torchvision.models (param pretrained=True)
91|Imágenes (RGB)|cv2.imread, PIL.Image
92|Convolución|scipy.signal.convolve2d
93|Filtros / Kernels|cv2.filter2D, cv2.Canny
94|Pooling|torch.nn.MaxPool2d
95|CNNs|torch.nn.Conv2d
96|LeNet-5|Implementación manual en PyTorch
97|AlexNet|torchvision.models.alexnet
98|VGG|torchvision.models.vgg16
99|ResNet|torchvision.models.resnet50
100|Inception|torchvision.models.inception_v3
101|Data Augmentation|albumentations, torchvision.transforms
102|Clasificación|timm (PyTorch Image Models)
103|Bounding Boxes|cv2.rectangle
104|R-CNN Family|torchvision.models.detection
105|YOLO Arquitectura|Lectura Paper
106|YOLO v8/v10/v11|ultralytics
107|SSD|torchvision.models.detection.ssd
108|IOU|torchvision.ops.box_iou
109|Non-Max Suppression|torchvision.ops.nms
110|Segmentación Semántica|segmentation-models-pytorch (U-Net)
111|Segmentación Instancia|torchvision.models.detection.maskrcnn
112|Reconocimiento Facial|insightface, deepface
113|OCR|paddleocr, pytesseract
114|Pose Estimation|mediapipe
115|Video Analytics|opencv (VideoCapure), supervision
116|3D / Point Clouds|open3d
117|NeRFs|nerfstudio
118|Gaussian Splatting|gsplat (repo oficial)
119|Vision Transformers|transformers.ViTModel
120|SAM (Segment Anything)|segment-anything (Meta lib)
121|Tokenización|spacy, nltk.word_tokenize
122|Stemming/Lemmatization|spacy (token.lemma_)
123|Bag of Words|sklearn.feature_extraction.text.CountVectorizer
124|TF-IDF|sklearn.feature_extraction.text.TfidfVectorizer
125|N-Grams|CountVectorizer(ngram_range=(1,2))
126|Embeddings|Concepto
127|Word2Vec|gensim.models.Word2Vec
128|GloVe / FastText|gensim.models.FastText
129|Similitud Coseno|sklearn.metrics.pairwise.cosine_similarity
130|RNNs|torch.nn.RNN
131|Memoria corto plazo|Problema teórico
132|LSTM|torch.nn.LSTM
133|GRU|torch.nn.GRU
134|Seq2Seq|Arquitectura Encoder-Decoder manual
135|Attention Mechanism|torch.nn.MultiheadAttention
136|Paper "Attention is All..."|Lectura (ArXiv)
137|Transformer Arch|transformers.BertModel (Estructura base)
138|Self-Attention|Implementación interna en HF
139|Positional Encoding|Fórmula matemática / Tensor
140|BERT|transformers.BertForMaskedLM
141|MLM|Tarea de entrenamiento
142|GPT (Historia)|Concepto
143|Causal LM|transformers.GPT2LMHeadModel
144|T5|transformers.T5ForConditionalGeneration
145|Librería Transformers|pip install transformers
146|Tokenizers HF|transformers.AutoTokenizer
147|Model Hubs|huggingface-cli
148|Métricas (BLEU/ROUGE)|evaluate (HF library), sacrebleu
149|Perplexity|torch.exp(loss)
150|Análisis Sentimiento|transformers.pipeline("sentiment-analysis")
151|LLMs Definición|Concepto
152|Scaling Laws|Concepto
153|Few-shot Learning|Prompt structure
154|Prompt Engineering|langchain.prompts.PromptTemplate
155|Chain-of-Thought|Prompt structure
156|Tree of Thoughts|langchain_experimental (o implementación custom)
157|Prompt Injection|lakera/gard (herramientas de seguridad)
158|Temp/Top-k/Top-p|Parámetros API OpenAI / HF
159|Alucinaciones|Concepto (Mitigación vía RAG)
160|Context Window|Configuración de modelo
161|RAG|llama_index
162|Chunking|langchain.text_splitter
163|Vector Databases|pinecone, milvus, chromadb
164|Embeddings RAG|openai-python (text-embedding-3), sentence-transformers
165|Reranking|cohere (API), flashrank
166|Knowledge Graphs + LLM|neo4j, langchain_community.graphs
167|Fine-Tuning Full|torch.optim (muy costoso)
168|PEFT|peft (HF library)
169|LoRA|peft.LoraConfig
170|QLoRA|bitsandbytes + peft
171|Quantization|bitsandbytes, auto-gptq
172|RLHF|trl (Transformer Reinforcement Learning)
173|DPO|trl.DPOTrainer
174|Open vs Closed|meta-llama vs openai
175|Ollama|ollama (CLI y libreria python)
176|GGUF|llama-cpp-python
177|vLLM|vllm (Servidor de inferencia)
178|Eval LLMs|ragas, deepeval
179|LangChain|langchain
180|LlamaIndex|llama_index
181|Agentes|langchain.agents
182|ReAct|langchain.agents.AgentType.REACT
183|Tool Calling|openai (tools parameter), pydantic
184|Planificación|Lógica custom en LangGraph
185|Memoria|langchain.memory, mem0
186|Multi-Agente|crewai, autogen
187|LangGraph|langgraph
188|Gen Imágenes|Concepto
189|VAEs|diffusers.AutoencoderKL
190|GANs|Implementación PyTorch Custom
191|Diffusion Models|diffusers
192|Forward/Reverse Process|diffusers.schedulers
193|Stable Diffusion|diffusers.StableDiffusionPipeline
194|ControlNet|diffusers.ControlNetModel
195|IP-Adapter|IP-Adapter (repo oficial)
196|Audio Espectrogramas|librosa.display.specshow
197|ASR|speech_recognition
198|Whisper|faster-whisper, openai-whisper
199|TTS|coqui-ai, edge-tts
200|Clonación Voz|elevenlabs (API), tortoise-tts
201|Separación Audio|demucs (Meta)
202|Multimodales|transformers.LlavaForConditionalGeneration
203|CLIP|clip (OpenAI repo), transformers.CLIPModel
204|LLaVA|transformers (versiones recientes)
205|GPT-4o|openai (API)
206|Gen Video|runway (API)
207|3D Gen|threestudio
208|Watermarking|imwatermark
209|Deepfakes|Herramientas forenses (Deepware)
210|Copyright|Legal
211|Ciclo ML|Concepto
212|Git|git
213|DVC|dvc (CLI)
214|Feature Stores|feast
215|Docker|docker, Dockerfile
216|Kubernetes|kubectl, minikube
217|Pipelines|apache-airflow, kfp (Kubeflow Pipelines)
218|CI/CD ML|cml (Iterative), GitHub Actions
219|Tracking Exps|mlflow, wandb
220|Model Registry|mlflow.register_model
221|APIs REST|fastapi, uvicorn
222|gRPC|grpcio
223|TorchServe|torchserve
224|Triton|tritonserver (NVIDIA container)
225|Serverless|modal, aws lambda
226|Batch vs Online|Arquitectura
227|Latencia/Throughput|locust (Load testing)
228|Model Monitoring|evidently
229|Drift|alibi-detect
230|A/B Testing|Feature Flags (LaunchDarkly)
231|Shadow Deployment|Istio / K8s config
232|Canary|Argo Rollouts
233|Autoscaling|KEDA (K8s Event-driven Autoscaling)
234|Costos Cloud|infracost
235|ONNX|onnx, onnxruntime
236|TensorRT|tensorrt
237|Edge AI|tflite-runtime
238|TFLite / CoreML|coremltools
239|Federated Learning|flower (flwr), tensorflow-federated
240|Privacidad Diferencial|opacus (PyTorch)
241|Conceptos Agente/Env|Teoría
242|MDP|Teoría
243|Políticas|Código Python Custom
244|Descuento (Gamma)|Parámetro en algoritmos
245|Epsilon-Greedy|Lógica condicional Python
246|V/Q Functions|Tablas NumPy
247|Ecuación Bellman|Fórmula
248|Monte Carlo|Implementación Python
249|TD Learning|Implementación Python
250|Q-Learning|Implementación con tabla NumPy
251|DQN|stable_baselines3.DQN
252|Experience Replay|Buffer interno en SB3
253|Target Networks|Interno en SB3
254|Policy Gradients|Implementación Vanilla PG
255|REINFORCE|Implementación Custom
256|Actor-Critic|stable_baselines3.A2C
257|A2C / A3C|stable_baselines3.A2C
258|PPO|stable_baselines3.PPO
259|TRPO|sb3_contrib.TRPO
260|Model-Based|Librerías especializadas (MBRL-Lib)
261|Inverse RL|imitation (Librería compatible con Gym)
262|MARL|pettingzoo
263|MCTS (AlphaGo)|Implementaciones custom
264|Gymnasium|gymnasium
265|MuJoCo|mujoco
266|Sim2Real|Concepto
267|Curriculum Learning|Lógica custom de entrenamiento
268|Offline RL|d3rlpy
269|World Models|Research papers
270|Apps RL|Casos de uso
271|Probabilidad Avanzada|pymc, tf-probability
272|Inferencia Variacional|pyro.infer
273|MCMC|pymc.sample
274|Procesos Gaussianos|gpytorch, scikit-learn
275|Grafos Teoría|networkx
276|GNNs|torch_geometric
277|GCN|torch_geometric.nn.GCNConv
278|GAT|torch_geometric.nn.GATConv
279|Neural ODEs|torchdiffeq
280|TDA|giotto-tda
281|Manifold Learning|sklearn.manifold
282|Geometría Info|Teoría
283|Optimizadores 2do orden|torch.optim.LBFGS
284|Meta-Learning|learn2learn
285|MAML|learn2learn.algorithms.MAML
286|Self-Supervised|lightly (SSL library)
287|Contrastive (SimCLR)|lightly.models.SimCLR
288|Masked Autoencoders|transformers.ViTMAE
289|Energy-Based|Research Code
290|Normalizing Flows|nflows
291|Causal Inference|dowhy, causalml
292|DAGs|networkx
293|Do-calculus|dowhy
294|Counterfactuals|dice-ml
295|Neuro-symbolic|scallop (Lang)
296|Sparse NN|torch.sparse
297|Lottery Ticket|Pruning methods
298|Distillation|Logits matching (Custom loss)
299|NAS|nni (Microsoft)
300|AutoML|auto-sklearn, h2o
301|Bias Algorítmico|Análisis de datos
302|Fairness Métricas|fairlearn.metrics
303|XAI|Concepto
304|SHAP / LIME|shap, lime
305|Cajas Negras|Concepto
306|Alignment|Investigación (Anthropic/OpenAI)
307|Adversarial Attacks|art (Adversarial Robustness Toolbox)
308|Privacidad|presidio-analyzer
309|GDPR|Legal
310|EU AI Act|Legal
311|Regulación Global|Legal
312|Copyright Datasets|Términos de servicio
313|Licencias|Apache 2.0, MIT, RAIL
314|Huella Carbono|codecarbon
315|Automatización|Economía
316|Sesgo Confirmación|Psicología
317|Filter Bubbles|Análisis de redes
318|Responsabilidad Civil|Legal
319|Armas Autónomas|Ética Militar
320|Bioseguridad|Protocolos
321|IA Soberana|Infraestructura
322|Open vs Closed Security|Debate
323|Antropomorfización|Psicología
324|Test Turing|Historia
325|Consciencia|Filosofía
326|Singularidad|Futurismo
327|X-Risk|Filosofía
328|Superinteligencia|Libro (Bostrom)
329|Orgs Seguridad|OpenAI, Anthropic
330|AI Governance|Policy
331|CPU/GPU/TPU|Hardware
332|Arq GPU|nvidia-smi
333|CUDA|numba.cuda, cupy
334|H100/A100|Cloud Instances
335|ASICs|Groq API
336|Neuromorphic|Loihi (Intel)
337|SNNs|snntorch
338|Quantum ML|pennylane, qiskit
339|Computación Óptica|Investigación
340|Edge Hardware|Jetson Nano, RPi
341|AWS SageMaker|boto3, sagemaker SDK
342|Vertex AI|google-cloud-aiplatform
343|Azure AI|azure-ai-ml
344|Databricks|pyspark, mlflow
345|SLMs (Small Models)|phi-3, gemma
346|1-bit LLMs|bitnet
347|Reasoning Models|OpenAI o1
348|Embodied AI|Simuladores
349|Leer Papers|arxiv.org
350|Reproducibilidad|docker, seeds fijas
351|Portafolio|github
352|Kaggle|kaggle CLI
353|HF Spaces|gradio, streamlit
354|Open Source|git pull request
355|Soft Skills|PowerPoint / Jupyter
356|Roles Ciencia Datos|LinkedIn
357|Roles Product Mgr|Jira
358|Roles Prompt Eng|Playgrounds
359|Entrevistas|leetcode
360|Aprendizaje Continuo|Newsletters
361|Networking|Eventos
362|Ética Profesional|Código de conducta
363|Realidad vs Hype|Pensamiento crítico
364|Copilots|github copilot, cursor
365|AGI|La meta"""

user_rows = []
for line in USER_TEXT.strip().split("\n"):
    parts = line.split("|")
    if len(parts) >= 3:
        day, tema, stack = int(parts[0]), parts[1], parts[2]
        user_rows.append((day, tema, stack))

current_by_day = {d: (t, s) for d, t, s, _ in CURRENT}

diffs = []
for ud, ut, us in user_rows:
    cd_tema, cd_stack = current_by_day.get(ud, ("?", "?"))
    if cd_tema != ut or cd_stack != us:
        diffs.append((ud, ut, us, cd_tema, cd_stack))

print(f"Total user rows: {len(user_rows)}")
print(f"Total current rows: {len(CURRENT)}")
print(f"Days that differ: {len(diffs)}")
print()
for ud, ut, us, ct, cs in diffs[:50]:
    print(f"Day {ud}:")
    print(f"  user:     '{ut}' / '{us}'")
    print(f"  current:  '{ct}' / '{cs}'")
    print()