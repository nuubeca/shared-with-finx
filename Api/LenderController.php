<?php

namespace Sasb\ApiBundle\Controller;

use FOS\RestBundle\Controller\Annotations\Get;
use Sasb\CoreBundle\Controller\Controller;
use Sasb\LenderBundle\Entity\ApiAccessKey;
use Sasb\LenderBundle\Entity\Lender;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\ParamConverter;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class LenderController extends Controller implements TokenAuthenticatedController
{
    /**
     * @Get("lenders")
     */
    public function getLendersAction(Request $request)
    {
        $apikey = $request->headers->get('Apikey');
        $lenders = $this->getEntityManager()->getRepository(Lender::class)->findByApiKey($apikey);
        $serializer = $this->container->get('serializer');
        $data = $serializer->normalize($lenders, null, ['groups' => ['lender']]);

        return new JsonResponse(['lenders' => $data], Response::HTTP_OK);
    }

    /**
     * @Get("lender/{lender_id}")
     * @ParamConverter("lender", class="SasbLenderBundle:Lender", options={"mapping" = {"lender_id": "id"}})
     */
    public function getLenderAction(Request $request, Lender $lender)
    {
        $apikey = $request->headers->get('Apikey');
        $apiKey = $this->getEntityManager()->getRepository(ApiAccessKey::class)->findOneBy(['apiKey' => $apikey]);

        if (!$apiKey->isLenderAuthorized($lender)) {
            return new JsonResponse(null, Response::HTTP_FORBIDDEN);
        }

        $serializer = $this->container->get('serializer');
        $data = $serializer->normalize($lender, null, ['groups' => ['lender']]);

        return new JsonResponse(['lender' => $data], Response::HTTP_OK);
    }
}
