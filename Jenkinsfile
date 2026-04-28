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
        
        ENV_TAG = "${(env.BRANCH_NAME ?: env.GIT_BRANCH ?: "").contains('main') ? 'prod' : 'dev'}"
        
        GITLAB_URL = "lab.ssafy.com/s14-final/S14P31B102.git"
    }

    stages {
        stage('Initialize & Release') {
            steps {
                script {
                    // 1. 다양한 변수에서 브랜치명을 추출 (일반 Pipeline 호환용)
                    // env.BRANCH_NAME이 없으면 env.GIT_BRANCH나 GitLab 플러그인 변수를 확인합니다.
                    def rawBranch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: env.gitlabTargetBranch ?: ""
                    
                    // 2. 'origin/develop' 같이 경로가 포함된 경우를 대비해 순수 이름만 추출
                    def currentBranch = rawBranch.replace('origin/', '')
                    
                    echo "--- 디버깅: 현재 인식된 브랜치명: ${currentBranch} ---"

                    // 3. 브랜치 검증
                    if (!(currentBranch in ['main', 'develop'])) {
                        currentBuild.result = 'ABORTED'
                        error "배포 중단: 대상 브랜치가 아닙니다. (인식된 브랜치: ${currentBranch})"
                    }

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
                    
                    // 5. 이후 단계를 위해 브랜치명을 표준화된 변수로 저장
                    env.NORMALIZED_BRANCH = currentBranch
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
                    sh "sed -i 's|env:.*|env: ${ENV_TAG}|g' k8s/frontend.yaml"
                    sh "sed -i 's|env:.*|env: ${ENV_TAG}|g' k8s/backend.yaml"

                    // 2. 푸시할 브랜치명 확정
                    def targetBranch = (env.GIT_BRANCH ?: env.BRANCH_NAME ?: env.gitlabTargetBranch ?: "develop").replace('origin/', '')
                    env.TARGET_BRANCH = targetBranch

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
                    
                    // 1. 시크릿 업데이트 (주석 해제 및 활용)
                    def backendSecretId = "backend-env-${ENV_TAG}"
                    withCredentials([file(credentialsId: backendSecretId, variable: 'BACK_ENV_FILE')]) {
                         sh "kubectl create secret generic backend-secrets --from-env-file=${BACK_ENV_FILE} -n ${ENV_TAG} --dry-run=client -o yaml | kubectl apply -f -"
                    }

                    // 2. 실제 배포 실행 (피어링된 사설 IP를 통해 마스터 노드에 명령 전달)
                    dir('k8s') {
                        sh "kubectl apply -f frontend.yaml -n ${ENV_TAG}"
                        sh "kubectl apply -f backend.yaml -n ${ENV_TAG}"
                    }
                    
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

def isTargetBranch() {
    // 젠킨스가 인식하는 여러 브랜치 변수들 중 하나라도 'main'이나 'develop'을 포함하는지 확인
    def b = env.GIT_BRANCH ?: env.BRANCH_NAME ?: env.gitlabTargetBranch ?: ""
    echo "--- 현재 브랜치 체크: ${b} ---"
    return b.contains('develop') || b.contains('main')
}