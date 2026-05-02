pipeline {
    agent any

    tools {
        nodejs 'node'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        DOCKER_HUB_ID = 'shyunnnn'
        FRONT_IMAGE = "${DOCKER_HUB_ID}/find-me-frontend"
        BACK_IMAGE = "${DOCKER_HUB_ID}/find-me-backend"
        HINT_IMAGE = "${DOCKER_HUB_ID}/find-me-hint"
        ORCH_IMAGE = "${DOCKER_HUB_ID}/find-me-orchestrator"

        // 초기값 설정 (Initialize 단계에서 업데이트됨)
        ENV_TAG = 'dev'

        GITLAB_URL = "lab.ssafy.com/s14-final/S14P31B102.git"
    }

    stages {
        stage('Initialize & Release') {
            steps {
                script {
                    def currentBranch = getNormalizedBranch()
                    env.NORMALIZED_BRANCH = currentBranch
                    echo "--- 인식된 브랜치: ${currentBranch} ---"

                    // 3. 브랜치 검증
                    if (currentBranch == null || !(currentBranch in ['main', 'develop'])) {
                        currentBuild.result = 'ABORTED'
                        error "배포 중단: 대상 브랜치가 아닙니다. (인식된 브랜치: ${currentBranch ?: 'unknown'})"
                    }

                    // 3.5 환경 태그 확정 (prod vs dev)
                    env.ENV_TAG = (currentBranch == 'main') ? 'prod' : 'dev'
                    echo "--- 확정된 환경 태그: ${env.ENV_TAG} ---"

                    // 4. 환경에 따른 처리 (currentBranch 변수 사용)
                    if (currentBranch == 'main') {
                        echo "--- 운영 환경 ---"
                        withCredentials([usernamePassword(credentialsId: 'gitlab-auth', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                            sh '''
                                # 1. 현재 브랜치 이름을 'main'으로 강제 고정
                                git checkout -B main

                                # semantic-release가 'origin/main'이 아닌 'main'으로 인식하도록 환경 변수 강제 설정
                                export GIT_BRANCH=main
                                export BRANCH_NAME=main

                                # 2. Git 인증 정보가 포함되도록 원격 URL 재설정
                                git remote set-url origin https://${GIT_USER}:${GIT_TOKEN}@${GITLAB_URL}

                                # 3. PR 관련 모든 변수를 빈 값으로 강제 덮어쓰기
                                export CI_MERGE_REQUEST_IID=""
                                export CI_MERGE_REQUEST_ID=""
                                export CI_EXTERNAL_PULL_REQUEST_IID=""
                                export CI_EXTERNAL_PULL_REQUEST_ID=""
                                export gitlabMergeRequestIid=""
                                export gitlabMergeRequestId=""
                                export CHANGE_ID=""
                                export PULL_REQUEST="false"

                                export GL_TOKEN=${GIT_TOKEN}

                                npm install

                                # 4. 인증 정보가 포함된 URL을 직접 전달하는 대신, 설정된 origin과 GL_TOKEN을 사용
                                npx semantic-release

                                # 태그 페치도 인증이 필요하므로 블록 안에서 실행
                                git fetch --tags || true
                            '''
                        }
                        env.IMAGE_TAG = sh(script: "git describe --tags --abbrev=0 || echo 'v1.0.0'", returnStdout: true).trim()
                    } else {
                        echo "--- 개발 환경 ---"
                        env.IMAGE_TAG = "${env.BUILD_NUMBER}-dev"
                    }
                    echo "--- 결정된 IMAGE_TAG: ${env.IMAGE_TAG} ---"
                }
            }
        }

        stage('Frontend Build & Push') {
            when {
                expression { return isTargetBranch() }
            }
            steps {
                script {
                    def frontendSecretId = "frontend-env-${ENV_TAG}"

                    withCredentials([file(credentialsId: frontendSecretId, variable: 'FRONT_ENV_FILE')]) {
                        // Credentials 파일을 .env로 복사하여 Docker 빌드 시 주입
                        sh "cp ${FRONT_ENV_FILE} frontend/.env"

                        try {
                            dir('frontend') {
                                sh "docker build --target ${ENV_TAG} -t ${FRONT_IMAGE}:${env.IMAGE_TAG} ."
                                sh "docker tag ${FRONT_IMAGE}:${env.IMAGE_TAG} ${FRONT_IMAGE}:${ENV_TAG}-latest"

                                withCredentials([usernamePassword(credentialsId: 'docker-hub-auth', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                                    sh "docker login -u $USER -p $PASS"
                                    sh "docker push ${FRONT_IMAGE}:${env.IMAGE_TAG}"
                                    sh "docker push ${FRONT_IMAGE}:${ENV_TAG}-latest"
                                }
                            }
                        } finally {
                            // 보안을 위해 빌드 완료 후 임시 .env 파일 삭제
                            sh "rm -f frontend/.env"
                        }
                    }
                }
            }
        }


        stage('Backend Build & Push') {
            when {
                expression { return isTargetBranch() }
                // anyOf { branch 'main'; branch 'develop' }
                // changeset "backend/**"
            }
            steps {
                script {
                    dir('backend') {
                        sh "docker build -t ${BACK_IMAGE}:${env.IMAGE_TAG} ."
                        sh "docker tag ${BACK_IMAGE}:${env.IMAGE_TAG} ${BACK_IMAGE}:${ENV_TAG}-latest"
                        withCredentials([usernamePassword(credentialsId: 'docker-hub-auth', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                            sh "docker login -u $USER -p $PASS"
                            sh "docker push ${BACK_IMAGE}:${env.IMAGE_TAG}"
                            sh "docker push ${BACK_IMAGE}:${ENV_TAG}-latest"
                        }
                    }
                }
            }
        }

        stage('Orchestrator Build & Push') {
            when {
                expression { return isTargetBranch() }
            }
            steps {
                script {
                    dir('ai/hint-orchestrator') {
                        sh "docker build -t ${ORCH_IMAGE}:${env.IMAGE_TAG} ."
                        sh "docker tag ${ORCH_IMAGE}:${env.IMAGE_TAG} ${ORCH_IMAGE}:${ENV_TAG}-latest"
                        withCredentials([usernamePassword(credentialsId: 'docker-hub-auth', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                            sh "docker login -u $USER -p $PASS"
                            sh "docker push ${ORCH_IMAGE}:${env.IMAGE_TAG}"
                            sh "docker push ${ORCH_IMAGE}:${ENV_TAG}-latest"
                        }
                    }
                }
            }
        }

        stage('Hint Worker Build & Push') {
            when {
                expression { return isTargetBranch() }
                changeset "hint-worker/**"
            }
            steps {
                script {
                    dir('hint-worker') {
                        sh "docker build -t ${HINT_IMAGE}:${env.IMAGE_TAG} ."
                        sh "docker tag ${HINT_IMAGE}:${env.IMAGE_TAG} ${HINT_IMAGE}:${ENV_TAG}-latest"
                        withCredentials([usernamePassword(credentialsId: 'docker-hub-auth', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                            sh "docker login -u $USER -p $PASS"
                            sh "docker push ${HINT_IMAGE}:${env.IMAGE_TAG}"
                            sh "docker push ${HINT_IMAGE}:${ENV_TAG}-latest"
                        }
                    }
                }
            }
        }

        stage('K8s Manifest Update & Push') {
            when {
                expression { return isTargetBranch() }
                // anyOf { branch 'main'; branch 'develop' }
                }
            steps {
                script {
                    def backendSecretId = "backend-env-${ENV_TAG}"

                    // 1. YAML 이미지 태그 업데이트
                    sh "sed -i 's|${FRONT_IMAGE}:.*|${FRONT_IMAGE}:${env.IMAGE_TAG}|g' k8s/frontend.yaml"
                    sh "sed -i 's|${BACK_IMAGE}:.*|${BACK_IMAGE}:${env.IMAGE_TAG}|g' k8s/backend.yaml"
                    sh "sed -i 's|${HINT_IMAGE}:.*|${HINT_IMAGE}:${env.IMAGE_TAG}|g' hint-worker/k8s-hint-cronjob.yaml"
                    sh "sed -i 's|${ORCH_IMAGE}:.*|${ORCH_IMAGE}:${env.IMAGE_TAG}|g' k8s/orchestrator.yml"

                    sh "sed -i 's|env:.*|env: ${ENV_TAG}|g' k8s/orchestrator.yml"
                    sh "sed -i 's|env:.*|env: ${ENV_TAG}|g' k8s/frontend.yaml"
                    sh "sed -i 's|env:.*|env: ${ENV_TAG}|g' k8s/backend.yaml"

                    // 2. 푸시할 브랜치명 확정
                    env.TARGET_BRANCH = env.NORMALIZED_BRANCH ?: getNormalizedBranch()

                    // 3. SSAFY GitLab에 업데이트된 Manifest 푸시
                    withCredentials([usernamePassword(credentialsId: 'gitlab-auth', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh 'git config user.email "jenkins@ssafy.com"'
                        sh 'git config user.name "Jenkins-CI"'
                        sh 'git add .'

                        // 커밋 메시지에 [skip ci]를 넣어 무한 루프 방지
                        sh "git commit -m 'chore(deploy): update image tag to ${env.IMAGE_TAG} [skip ci]' || echo 'nothing to commit'"

                        sh 'git pull https://${GIT_USER}:${GIT_PASS}@${GITLAB_URL} ${TARGET_BRANCH} --rebase'
                        sh 'git push https://${GIT_USER}:${GIT_PASS}@${GITLAB_URL} HEAD:${TARGET_BRANCH}'
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when { expression { return isTargetBranch() } }
            steps {
                script {
                    echo "--- ${ENV_TAG} 환경에 배포를 시작합니다 ---"

                    // 네임스페이스가 없으면 생성 (dev/prod)
                    sh "kubectl create namespace ${ENV_TAG} --dry-run=client -o yaml | kubectl apply -f -"
                    // 1. 시크릿 업데이트
                    def backendSecretId = "backend-env-${ENV_TAG}"
                    withCredentials([file(credentialsId: backendSecretId, variable: 'BACK_ENV_FILE')]) {
                         sh "kubectl create secret generic backend-secrets --from-env-file=${BACK_ENV_FILE} -n ${ENV_TAG} --dry-run=client -o yaml | kubectl apply -f -"
                    }

                    def orchSecretId = "orchestrator-env-${ENV_TAG}"
                    withCredentials([file(credentialsId: orchSecretId, variable: 'ORCH_ENV_FILE')]) {
                         sh "kubectl create secret generic orchestrator-secrets --from-env-file=${ORCH_ENV_FILE} -n ${ENV_TAG} --dry-run=client -o yaml | kubectl apply -f -"
                    }

                    // 2. 실제 서비스 배포 (Frontend, Backend)
                    dir('k8s') {
                        sh "kubectl apply -f orchestrator.yml -n ${ENV_TAG}"
                        sh "kubectl rollout status deploy/hint-orchestrator -n ${ENV_TAG} --timeout=180s"

                        sh "kubectl apply -f frontend.yaml -n ${ENV_TAG}"
                        sh "kubectl apply -f backend.yaml -n ${ENV_TAG}"

                        if (ENV_TAG == 'prod') {
                            sh "kubectl apply -f backend-hpa.yaml -n ${ENV_TAG}"
                        }
                    }

                    // 3. Hint Worker 시크릿 및 배포 (별도 네임스페이스 lucas-elk 사용)
                    sh "kubectl create namespace lucas-elk --dry-run=client -o yaml | kubectl apply -f -"
                    def hintSecretId = "hint-env-${ENV_TAG}"
                    withCredentials([file(credentialsId: hintSecretId, variable: 'HINT_ENV_FILE')]) {
                         sh "kubectl create secret generic hint-secrets --from-env-file=${HINT_ENV_FILE} -n lucas-elk --dry-run=client -o yaml | kubectl apply -f -"
                    }
                    sh "kubectl apply -f hint-worker/k8s-hint-cronjob.yaml -n lucas-elk"
                    echo "--- 배포 완료! ---"
                }
            }
        }
    }

    post {
        success {
            script {
                def message = """
                    :white_check_mark: Build SUCCESS! #${env.BUILD_NUMBER} (${env.IMAGE_TAG}//${env.ENV_TAG})
                """.stripIndent()
                mattermostSend(color: 'good', message: message)
            }
        }
        failure {
            script {
                def message = """
                    :x: Build FAILED... #${env.BUILD_NUMBER} (${env.IMAGE_TAG}//${env.ENV_TAG})
                """.stripIndent()
                mattermostSend(color: 'danger', message: message)
            }
        }
    }
}

def getNormalizedBranch() {
    // MR 대상 브랜치 -> PR 대상 브랜치 -> 현재 브랜치 순으로 확인 후 정규화된 이름 반환
    def raw = env.gitlabTargetBranch ?: env.CHANGE_TARGET ?: env.BRANCH_NAME ?: env.GIT_BRANCH ?: "develop"
    if (raw == "null") raw = "develop"
    return raw.replaceAll(/^(origin\/|remotes\/origin\/|remotes\/)/, "")
}

def isTargetBranch() {
    def b = getNormalizedBranch()
    echo "--- 현재 브랜치 체크 : ${b} ---"
    return (b == 'main' || b == 'develop')
}
