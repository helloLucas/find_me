pipeline {
    agent any

    environment {
        // 본인의 도커 허브 아이디로 반드시 수정하세요
        DOCKER_HUB_ID = 'shyunnnn'
        FRONT_IMAGE = "${DOCKER_HUB_ID}/find-me-frontend"
        BACK_IMAGE = "${DOCKER_HUB_ID}/find-me-backend"
    }

    stages {
        stage('Git Checkout') {
            steps {
                // GitLab 프로젝트 소스 코드를 가져옵니다.
                checkout scm
            }
        }

        stage('Frontend Build & Push') {
            when {
                // frontend 폴더 내부 파일이 변경되었을 때만 실행
                changeset "frontend/**"
            }
            steps {
                script {
                    // 젠킨스에 등록한 'frontend-env' 시크릿 파일을 임시 변수에 할당
                    withCredentials([file(credentialsId: 'frontend-env', variable: 'FRONT_ENV_FILE')]) {
                        // .env 파일 내용 중 VITE_API_BASE_URL 값을 추출하여 빌드 시점에 주입
                        def apiUrl = sh(script: "grep VITE_API_BASE_URL ${FRONT_ENV_FILE} | cut -d '=' -f2", returnStdout: true).trim()
                        
                        dir('frontend') {
                            echo "--- 프론트엔드 빌드 시작 (API 주소: ${apiUrl}) ---"
                            sh "docker build --build-arg VITE_API_BASE_URL=${apiUrl} -t ${FRONT_IMAGE}:${env.BUILD_NUMBER} ."
                            sh "docker tag ${FRONT_IMAGE}:${env.BUILD_NUMBER} ${FRONT_IMAGE}:latest"

                            // 도커 허브 푸시
                            withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                                sh "docker login -u $USER -p $PASS"
                                sh "docker push ${FRONT_IMAGE}:${env.BUILD_NUMBER}"
                                sh "docker push ${FRONT_IMAGE}:latest"
                            }
                        }
                    }
                }
            }
        }

        stage('Backend Build & Push') {
            when {
                // backend 폴더 내부 파일이 변경되었을 때만 실행
                changeset "backend/**"
            }
            steps {
                script {
                    dir('backend') {
                        echo "--- 백엔드 멀티 스테이지 빌드 시작 ---"
                        sh "docker build -t ${BACK_IMAGE}:${env.BUILD_NUMBER} ."
                        sh "docker tag ${BACK_IMAGE}:${env.BUILD_NUMBER} ${BACK_IMAGE}:latest"

                        // 도커 허브 푸시
                        withCredentials([usernamePassword(credentialsId: 'docker-hub-credentials', usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                            sh "docker login -u $USER -p $PASS"
                            sh "docker push ${BACK_IMAGE}:${env.BUILD_NUMBER}"
                            sh "docker push ${BACK_IMAGE}:latest"
                        }
                    }
                }
            }
        }

        stage('K8s Secret & Manifest Update') {
            steps {
                script {
                    echo "--- 쿠버네티스 설정 및 시크릿 업데이트 ---"
                    
                    // 1. 백엔드용 .env 파일을 쿠버네티스 Secret으로 생성/갱신 (envFrom 방식 지원)
                    withCredentials([file(credentialsId: 'backend-env', variable: 'BACK_ENV_FILE')]) {
                        // 기존 시크릿이 있으면 덮어쓰고, 없으면 새로 생성 (dry-run 사용)
                        sh "kubectl create secret generic backend-secrets --from-env-file=${BACK_ENV_FILE} --dry-run=client -o yaml | kubectl apply -f -"
                    }

                    // 2. YAML 파일 내의 이미지 태그를 현재 빌드 번호(${env.BUILD_NUMBER})로 변경
                    sh "sed -i 's|${FRONT_IMAGE}:.*|${FRONT_IMAGE}:${env.BUILD_NUMBER}|g' k8s/frontend.yaml"
                    sh "sed -i 's|${BACK_IMAGE}:.*|${BACK_IMAGE}:${env.BUILD_NUMBER}|g' k8s/backend.yaml"

                    // 3. 업데이트된 YAML을 GitLab에 다시 Push (ArgoCD가 변경사항을 감지하도록 함)
                    withCredentials([usernamePassword(credentialsId: 'gitlab-credentials', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                        sh "git config user.email 'jenkins@lucas.kr'"
                        sh "git config user.name 'Jenkins CI'"
                        sh "git add k8s/*.yaml"
                        // [skip ci]는 젠킨스가 자신의 푸시를 보고 무한 빌드하는 것을 방지함
                        sh "git commit -m 'Deploy: Update image tag to ${env.BUILD_NUMBER} [skip ci]'"
                        // 본인의 GitLab 레포지토리 주소로 수정 필요
                        sh "git push https://${GIT_USER}:${GIT_PASS}@gitlab.com/your-username/your-repo.git HEAD:main"
                    }
                }
            }
        }
    }
}