\LoadClass[a4paper,12pt]{report} % Classe du document

%--------------------- Packages ------------------------

\RequirePackage[french]{babel}
\RequirePackage[utf8]{inputenc}
\RequirePackage[section]{placeins}
\RequirePackage[T1]{fontenc}
\RequirePackage{mathtools}
\RequirePackage{siunitx}
\RequirePackage{float}
\RequirePackage{graphicx}
\RequirePackage[justification=centering]{caption}
\RequirePackage{subcaption}
\RequirePackage{wallpaper}
\RequirePackage{nomencl}
\RequirePackage{fancyhdr}
\RequirePackage{url}
\RequirePackage[hidelinks]{hyperref}
\RequirePackage[left=2.5cm,right=2.5cm,top=2cm,bottom=3.5cm]{geometry}
\RequirePackage{booktabs}
\RequirePackage{array}
\RequirePackage{tabularx}
\RequirePackage{xcolor}
\RequirePackage{multirow}
\RequirePackage{enumitem}

% Couleurs N+ONE
\definecolor{noneNavy}{HTML}{003049}
\definecolor{noneOrange}{HTML}{F77F00}

%-------------------- Informations sur le rapport ----------------------

\newcommand{\UE}[1]{\renewcommand{\UE}{#1}}
\newcommand{\sujet}[1]{\renewcommand{\sujet}{#1}}
\newcommand{\titre}[1]{\renewcommand{\titre}{#1}}
\newcommand{\encadrants}[1]{\renewcommand{\encadrants}{#1}}
\newcommand{\eleve}[1]{\renewcommand{\eleve}{#1}}
\newcommand{\periode}[1]{\renewcommand{\periode}{#1}}

% Compat avec ancien template (enseignant = encadrants)
\newcommand{\enseignant}[1]{\renewcommand{\encadrants}{#1}}
\newcommand{\eleves}[1]{\renewcommand{\eleve}{#1}}

\newcommand{\fairemarges}{
\makenomenclature
\pagestyle{fancy}
\fancyheadoffset{1cm}
\setlength{\headheight}{2cm}
\lhead{\includegraphics[scale=0.1]{logos/ensias.png}}
\rhead{\nouppercase{\leftmark}}
\rfoot{\thepage}
\cfoot{\textbf{\titre}}
\lfoot{\UE}
}

\newcommand{\fairepagedegarde}{
\begin{titlepage}
\ThisLRCornerWallPaper{1}{logos/background.png}
    \centering
    \includegraphics[width=0.5\textwidth]{logos/ensias.png}\par\vspace{1cm}
    {\scshape\LARGE École Nationale Supérieure d'Informatique\\et d'Analyse des Systèmes -- Rabat \par}
    \vspace{1.5cm}
    {\scshape\Large \UE \\ \sujet \par}
    \vspace{1cm}
    \rule{\linewidth}{0.2mm} \\[0.4cm]
    {\huge\bfseries \titre \par}
    \rule{\linewidth}{0.2mm} \\[1.5cm]
    \vspace{0.5cm}

    \begin{minipage}{0.5\textwidth}
        \begin{flushleft}\large
        \emph{\textbf{Stagiaire :}}\\
        \eleve\\[0.8cm]
        \emph{\textbf{Période :}}\\
        \periode\\
        \end{flushleft}
    \end{minipage}
    ~
    \begin{minipage}{0.4\textwidth}
        \begin{flushright}\large
        \emph{\textbf{Encadrants :}}\\
        \encadrants\\
        \end{flushright}
    \end{minipage}\\[2cm]

    \vfill
    {\large \today\par}
\end{titlepage}
}

\newcommand{\tabledematieres}{
\tableofcontents
\newpage
}

\newcommand{\insererfigure}[4]{
\begin{figure}[ht]
\centering
\includegraphics[height=#2]{#1}
\caption{#3}
\label{fig:#4}
\end{figure}
}
