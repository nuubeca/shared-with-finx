<?php

namespace Sasb\ApiBundle\Controller;

use FOS\RestBundle\Controller\Annotations\Get;
use FOS\RestBundle\Controller\Annotations\Post;
use FOS\RestBundle\Controller\FOSRestController;
use PointComMedia\DebtDepreciationBundle\Entity\PaymentFrequency;
use Sasb\ApiBundle\Exception\ApiValidationException;
use Sasb\ApiBundle\Exception\ClientAlreadyExistsException;
use Sasb\ApiBundle\Exception\ClientNotFoundException;
use Sasb\ApiBundle\Exception\InvalidContentFormatException;
use Sasb\ApiBundle\Exception\LenderNotFoundException;
use Sasb\ApiBundle\Form\Type\ClientType;
use Sasb\ApiBundle\Form\Type\DebtType;
use Sasb\ClientBundle\Entity\Client;
use Sasb\FinancialBundle\Entity\ClientDocument;
use Sasb\FinancialBundle\Entity\Record;
use Sasb\LenderBundle\Entity\ApiAccessKey;
use Sasb\LenderBundle\Entity\Lender;
use Symfony\Component\Form\FormInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordController extends FOSRestController implements TokenAuthenticatedController
{
    // Can't find a use for this, uncomment if needed (or delete if not)
    /**
     * @Get("records")
     */
    // public function getRecordsAction(Request $request)
    // {
    //     $apikey = $request->headers->get('Apikey');
    //     $page = $request->query->get('page') ?: 0;
    //     $pageSize = $request->query->get('page_size') ?: 20;
    //     // $lender = $this->getEntityManager()->getRepository(Lender::class)->findOneByImportationApiKey($apikey);
    //     /*
    //      * TODO : Hardcoding this for now... put back to normal when done.
    //      */

    //     $lenders = $this->getEntityManager()->getRepository(Lender::class)->findById([
    //         1,
    //         3
    //     ]);

    //     $records = $this->getEntityManager()->getRepository(Record::class)
    //         ->createQueryBuilder('r')
    //         ->andWhere('r.lender IN (:lenders)')
    //         ->setParameter('lenders', $lenders)
    //         ->setMaxResults($pageSize)
    //         ->setFirstResult($page * $pageSize)
    //         ->getQuery()
    //         ->getResult();

    //     $result = [];
    //     $normalizer = $this->container->get('api.record_normalizer');
    //     foreach ($records as $record) { 
    //             $result[] = $normalizer->normalize($record);
    //     }

    //     return new JsonResponse(['records' => $result], Response::HTTP_OK);
    // }

    /**
     * @Post("clients/records")
     */
    public function postRecordAndClientAction(Request $request)
    {
        $apiAccessKey = $this->getEntityManager()->getRepository(ApiAccessKey::class)->findOneBy(['apiKey' => $request->headers->get('ApiKey')]);
        $lenderId = $request->headers->get('LenderId');
        $lender = $this->getEntityManager()->getRepository(Lender::class)->findOneById($lenderId);
        if (!$lender) {
            throw new LenderNotFoundException('Prêteur introuvable.');
        }

        $content = $request->getContent();
        $content = json_decode($content, true);
        if (!isset($content['client']) || !isset($content['record'])) {
            throw new InvalidContentFormatException('Contenu invalide, le contenu "client" ou "record" est manquant.');
        }
        $clientData = $content['client'];
        $recordData = $content['record'];

        $client = new Client();
        $clientForm = $this->createForm(ClientType::class, $client, ['csrf_protection' => false, 'allow_extra_fields' => true]);
        $clientForm->submit($clientData);

        //Check if client already exists
        $existingClient = $this->getEntityManager()->getRepository(Client::class)->findOneBySocialSecurityNumber($clientForm->getData()->getSocialSecurityNumber());
        if ($existingClient) {
            throw new ClientAlreadyExistsException(sprintf('Impossible d’ajouter le client "%s" parce que celui-ci existe déjà.', $clientForm->getData()));
        }

        if (!$clientForm->isValid()) {
            throw new ApiValidationException($clientForm);
        }

        $client = $clientForm->getData();
        $record = $this->createRecord($lender, $client, $recordData, $apiAccessKey);

        $documents = [];
        if (isset($content['documents'])) {
            $documents = $this->parseDocuments($record, $client, $content['documents']);
        }

        $this->getApiManager()->createRecordAndClient($client, $record, $documents);

        return new JsonResponse(['message' => 'Client created'], Response::HTTP_CREATED);
    }

    /**
     * @Post("clients/{ssn}/records")
     */
    public function postRecordsAction(Request $request, $ssn)
    {
        $apiAccessKey = $this->getEntityManager()->getRepository(ApiAccessKey::class)->findOneBy(['apiKey' => $request->headers->get('ApiKey')]);
        $lenderId = $request->headers->get('LenderId');
        $lender = $this->getEntityManager()->getRepository(Lender::class)->findOneById($lenderId);
        if (!$lender) {
            throw new LenderNotFoundException('Prêteur introuvable.');
        }

        $content = $request->getContent();
        $content = json_decode($content, true);
        if (!isset($content['record'])) {
            throw new InvalidContentFormatException('Le contenu "record" est manquant.');
        }

        $client = $this->getEntityManager()->getRepository(Client::class)->findOneBySocialSecurityNumber($ssn);

        if (!$client) {
            throw new ClientNotFoundException('Aucun client trouvé avec ce numéro d’assurance sociale.');
        }

        $record = $this->createRecord($lender, $client, $content['record'], $apiAccessKey);

        $documents = [];
        if (isset($content['documents'])) {
            $documents = $this->parseDocuments($record, $client, $content['documents']);
        }

        $this->getApiManager()->createRecord($client, $record, $documents);

        return new JsonResponse(['message' => 'Record created'], Response::HTTP_CREATED);
    }

    /**
     * @method createRecord
     *
     * @since 1.0.0
     */
    protected function createRecord(Lender $lender, Client $client, array $content, ApiAccessKey $apiAccessKey)
    {
        $recordForm = $this->createForm(DebtType::class, new Record(), ['csrf_protection' => false, 'allow_extra_fields' => true]);
        $recordForm->submit($content);

        if (!$recordForm->isValid()) {
            throw new ApiValidationException($recordForm);
        }

        $record = $recordForm->getData();

        if (isset($content['extraRecordData']) && !empty($content['extraRecordData']) && is_array($content['extraRecordData'])) {
            $record->setExtraRecordData($content['extraRecordData']);
        }

        //Check for duplicates
        $existingRecords = $this->getEntityManager()->getRepository(Record::class)->findBy([
            'lender' => $lender,
            'identifier' => $record->getIdentifier(),
            'debtIdentifier' => $record->getDebtIdentifier(),
        ]);
        if ($existingRecords) {
            throw new ClientAlreadyExistsException(sprintf('Impossible d’ajouter le client "%s" pour le prêteur "%s" parce que celui-ci existe déjà.', $record->getIdentifier(), $lender));
        }

        //Record status is hardcoded
        $record->setStatus(Record::STATUS_NEW_RECORD);
        $record->addPaymentFrequency($recordForm->get('paymentFrequency')->getData());
        $record->setLender($lender);
        $record->setApiAccessKey($apiAccessKey);

        return $record;
    }

    public function buildErrorArray(FormInterface $form)
    {
        $errors = [];

        foreach ($form->all() as $child) {
            $errors = array_merge(
                $errors,
                $this->buildErrorArray($child)
            );
        }

        foreach ($form->getErrors() as $error) {
            $errors[$error->getCause()->getPropertyPath()] = $error->getMessage();
        }

        return $errors;
    }

    /**
     * @method parseDocuments
     *
     * @since 1.0.0
     */
    protected function parseDocuments(Record $record, Client $client, array $documents)
    {
        $result = [];
        foreach ($documents as $document) {
            if (!isset($document['filename']) || !isset($document['content'])) {
                throw new InvalidContentFormatException('Impossible d’ajouter le document parce que le format de données est invalide.');
            }

            $clientDocument = new ClientDocument();
            $clientDocument->setType(ClientDocument::TYPE_OTHER);
            $clientDocument->setRecord($record);
            $clientDocument->setClient($client);
            $clientDocument->setFilename($document['filename']);
            $clientDocument->setMimetype('application/pdf');
            $clientDocument->setContent(base64_decode($document['content']));
            $result[] = $clientDocument;
        }

        return $result;
    }

    /**
     * @method getApiManager
     *
     * @since 1.0.0
     */
    protected function getApiManager()
    {
        return $this->container->get('api.api_manager');
    }

    /**
     * @method getEntityManager
     *
     * @since 1.0.0
     */
    protected function getEntityManager()
    {
        return $this->get('doctrine.orm.entity_manager');
    }
}
